export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMail } from '@/lib/mailer'
import { rateLimit } from '@/lib/rate-limit'

function randomToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`forgot:${ip}`, 5, 60_000)) {
    return Response.json({ ok: true }) // silently rate-limit, don't reveal
  }

  const { email } = await req.json().catch(() => ({}))
  if (!email) return Response.json({ ok: true }) // always ok to avoid email enumeration

  const { data: barber } = await supabaseAdmin
    .from('barbers').select('id, naam, email').eq('email', email.toLowerCase().trim()).single()

  if (!barber) return Response.json({ ok: true })

  const token = randomToken()
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 uur

  await Promise.all([
    supabaseAdmin.from('settings').upsert(
      { barber_id: barber.id, key: 'reset_token', value: token },
      { onConflict: 'barber_id,key' }
    ),
    supabaseAdmin.from('settings').upsert(
      { barber_id: barber.id, key: 'reset_expires', value: expires },
      { onConflict: 'barber_id,key' }
    ),
  ])

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const resetUrl = `${base}/wachtwoord-reset?token=${token}`

  await sendMail({
    to: barber.email,
    subject: 'Wachtwoord opnieuw instellen — Schuurtje',
    html: `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="background:#111;border-radius:16px 16px 0 0;padding:22px 32px;border-bottom:2px solid #2176d4">
  <span style="color:#2176d4;font-size:22px;font-weight:900">✂</span>
  <span style="color:#fff;font-weight:800;font-size:18px;letter-spacing:1.5px;text-transform:uppercase;margin-left:8px">Schuurtje</span>
</td></tr>
<tr><td style="background:#141414;padding:32px;border:1px solid #222">
  <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">Wachtwoord opnieuw instellen</h1>
  <p style="color:#9ca3af;font-size:14px;margin:0 0 28px">Hoi ${barber.naam}, gebruik onderstaande knop om een nieuw wachtwoord in te stellen. Deze link verloopt over 1 uur.</p>
  <a href="${resetUrl}" style="display:block;background:#2176d4;color:#fff;font-weight:700;font-size:15px;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:16px">Nieuw wachtwoord instellen →</a>
  <p style="color:#6b7280;font-size:12px;margin:0">Als je dit niet hebt aangevraagd, kun je dit bericht negeren.</p>
</td></tr>
<tr><td style="background:#0f0f0f;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;border:1px solid #222;border-top:1px solid #1e1e1e">
  <p style="margin:0;color:#4b5563;font-size:12px">Schuurtje &middot; Kapper Portaal</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  }).catch(() => {})

  return Response.json({ ok: true })
}
