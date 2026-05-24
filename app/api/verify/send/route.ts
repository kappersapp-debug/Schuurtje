import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import { stuurVerificatieMail } from '@/lib/mailer'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

function genereerCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const body = await req.json().catch(() => null)
  const { email, slug } = body ?? {}

  if (!email || !slug) return Response.json({ error: 'email en slug verplicht' }, { status: 400 })

  if (!rateLimit(`verify:${email}`, 3, 10 * 60_000)) {
    return Response.json({ error: 'Te veel pogingen, wacht 10 minuten' }, { status: 429 })
  }
  if (!rateLimit(`verify-ip:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const { data: barber } = await supabaseAdmin
    .from('barbers').select('id, naam').eq('slug', slug).eq('actief', true).single()
  if (!barber) return Response.json({ error: 'Kapper niet gevonden' }, { status: 404 })

  // Check gebanned
  const { data: ban } = await supabaseAdmin
    .from('banned_emails').select('id').eq('barber_id', barber.id).eq('email', email.toLowerCase().trim()).single()
  if (ban) return Response.json({ banned: true }, { status: 403 })

  const code = genereerCode()
  const expires_at = new Date(Date.now() + 10 * 60_000).toISOString()

  // Verwijder oude codes voor dit email
  await supabaseAdmin.from('verification_codes')
    .delete().eq('barber_id', barber.id).eq('email', email.toLowerCase().trim())

  await supabaseAdmin.from('verification_codes').insert({
    barber_id: barber.id,
    email: email.toLowerCase().trim(),
    code_hash: hashCode(code),
    expires_at,
  })

  try {
    await stuurVerificatieMail({ naar: email, code, kapperNaam: barber.naam })
  } catch {
    return Response.json({ error: 'Mail versturen mislukt' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
