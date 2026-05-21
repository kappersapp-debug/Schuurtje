export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'

const attempts = new Map<string, { count: number; lockedUntil: number }>()

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const entry = attempts.get(ip) ?? { count: 0, lockedUntil: 0 }

  if (entry.lockedUntil > now) {
    return Response.json({ error: 'Te veel pogingen. Probeer later opnieuw.' }, { status: 429 })
  }
  if (!rateLimit(`opzoeken:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const { code, email } = body ?? {}
  if (!code || !email) return Response.json({ error: 'Code en e-mail zijn vereist' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, code, naam, email, service, prijs, duur, datum, tijd, notities')
    .eq('code', code.toUpperCase())
    .eq('geannuleerd', false)
    .single()

  if (!booking || booking.email.toLowerCase() !== email.toLowerCase().trim()) {
    entry.count += 1
    if (entry.count >= 5) { entry.lockedUntil = now + 15 * 60 * 1000; entry.count = 0 }
    attempts.set(ip, entry)
    return Response.json({ error: 'Afspraak niet gevonden' }, { status: 404 })
  }

  attempts.delete(ip)
  return Response.json({
    ok: true,
    afspraak: {
      code: booking.code,
      naam: booking.naam,
      service: booking.service,
      prijs: booking.prijs,
      duur: booking.duur,
      datum: booking.datum,
      tijd: booking.tijd,
      notities: booking.notities,
    },
  })
}
