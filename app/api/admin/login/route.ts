import { NextRequest } from 'next/server'
import { createAdminToken, COOKIE_ADMIN, TTL } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`admin-login:${ip}`, 5, 60_000)) {
    return Response.json({ error: 'Te veel pogingen' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.wachtwoord) {
    return Response.json({ error: 'Email en wachtwoord verplicht' }, { status: 400 })
  }

  const geldig =
    body.email === process.env.ADMIN_EMAIL &&
    body.wachtwoord === process.env.ADMIN_PASSWORD

  if (!geldig) return Response.json({ error: 'Ongeldige inloggegevens' }, { status: 401 })

  const token = createAdminToken()
  const res = Response.json({ ok: true })
  res.headers.set('Set-Cookie', `${COOKIE_ADMIN}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL}`)
  return res
}
