import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stuurAnnuleringsBevestiging } from '@/lib/mailer'
import { nlVandaag } from '@/lib/slots'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase()
  if (!code) return Response.json({ status: 'not_found' })

  const { data: active } = await supabaseAdmin
    .from('bookings')
    .select('id, naam, service, prijs, duur, datum, tijd')
    .eq('code', code)
    .eq('geannuleerd', false)
    .single()

  if (active) {
    return Response.json({ status: 'active', naam: active.naam, service: active.service, prijs: active.prijs, duur: active.duur, datum: active.datum, tijd: active.tijd })
  }

  const { data: cancelled } = await supabaseAdmin
    .from('cancelled_bookings').select('code').eq('code', code).single()
  if (cancelled) return Response.json({ status: 'geannuleerd' })

  return Response.json({ status: 'not_found' })
}

const attempts = new Map<string, { count: number; lockedUntil: number }>()

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const entry = attempts.get(ip) ?? { count: 0, lockedUntil: 0 }

  if (entry.lockedUntil > now) {
    return Response.json({ error: 'Te veel pogingen. Probeer later opnieuw.' }, { status: 429 })
  }

  if (!rateLimit(`annuleer:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const { code, email, reden } = body ?? {}
  if (!code || !email) return Response.json({ error: 'Code en e-mail zijn vereist' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, barber_id, naam, email, service, prijs, datum, tijd, duur, telefoon')
    .eq('code', code.toUpperCase())
    .eq('geannuleerd', false)
    .single()

  if (!booking || booking.email.toLowerCase() !== email.toLowerCase().trim()) {
    entry.count += 1
    if (entry.count >= 5) { entry.lockedUntil = now + 15 * 60 * 1000; entry.count = 0 }
    attempts.set(ip, entry)
    return Response.json({ error: 'Afspraak niet gevonden' }, { status: 404 })
  }

  if (booking.datum < nlVandaag()) {
    return Response.json({ error: 'Afspraak is al geweest' }, { status: 400 })
  }

  attempts.delete(ip)

  const { data: barber } = await supabaseAdmin
    .from('barbers').select('naam, slug').eq('id', booking.barber_id).single()

  await supabaseAdmin.from('bookings').update({ geannuleerd: true }).eq('id', booking.id)

  await supabaseAdmin.from('cancelled_bookings').insert({
    barber_id: booking.barber_id,
    code: code.toUpperCase(),
    naam: booking.naam,
    email: booking.email,
    telefoon: booking.telefoon ?? '',
    service: booking.service,
    prijs: booking.prijs ?? 0,
    datum: booking.datum,
    tijd: booking.tijd,
    duur: booking.duur,
    reden: reden ?? null,
  }).then(undefined, () => {})

  stuurAnnuleringsBevestiging({
    naar: booking.email,
    naam: booking.naam,
    kapperNaam: barber?.naam ?? 'de kapper',
    service: booking.service,
    datum: booking.datum,
    tijd: booking.tijd,
    code: code.toUpperCase(),
  }).catch(() => {})

  return Response.json({ ok: true })
}
