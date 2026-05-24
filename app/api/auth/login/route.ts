import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createKapperToken, COOKIE_KAPPER, TTL } from '@/lib/auth'
import { compare } from 'bcryptjs'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`login:${ip}`, 5, 60_000)) {
    return Response.json({ error: 'Te veel pogingen, wacht even' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.wachtwoord) {
    return Response.json({ error: 'Email en wachtwoord verplicht' }, { status: 400 })
  }

  const { data: barber } = await supabaseAdmin
    .from('barbers')
    .select('id, naam, slug, email, password_hash')
    .eq('email', body.email.toLowerCase().trim())
    .eq('actief', true)
    .single()

  if (!barber || !(await compare(body.wachtwoord, barber.password_hash))) {
    return Response.json({ error: 'Ongeldige inloggegevens' }, { status: 401 })
  }

  const token = createKapperToken({ id: barber.id, email: barber.email, slug: barber.slug, naam: barber.naam })
  const res = Response.json({ ok: true, slug: barber.slug })
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.headers.set('Set-Cookie', `${COOKIE_KAPPER}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL}${secure}`)
  return res
}
