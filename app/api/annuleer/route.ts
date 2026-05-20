import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stuurAnnuleringsBevestiging } from '@/lib/mailer'
import { nlVandaag } from '@/lib/slots'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`annuleer:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const { code, reden } = body ?? {}
  if (!code) return Response.json({ error: 'Code verplicht' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, barber_id, naam, email, service, prijs, datum, tijd, duur')
    .eq('code', code.toUpperCase())
    .eq('geannuleerd', false)
    .single()

  if (!booking) return Response.json({ error: 'Afspraak niet gevonden' }, { status: 404 })
  if (booking.datum < nlVandaag()) {
    return Response.json({ error: 'Afspraak is al geweest' }, { status: 400 })
  }

  const { data: barber } = await supabaseAdmin
    .from('barbers')
    .select('naam, slug')
    .eq('id', booking.barber_id)
    .single()

  await supabaseAdmin.from('bookings').update({ geannuleerd: true }).eq('id', booking.id)

  await supabaseAdmin.from('cancelled_bookings').insert({
    barber_id: booking.barber_id,
    code: code.toUpperCase(),
    naam: booking.naam,
    email: booking.email,
    telefoon: '',
    service: booking.service,
    prijs: booking.prijs,
    datum: booking.datum,
    tijd: booking.tijd,
    duur: booking.duur,
    reden: reden ?? null,
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  try {
    await stuurAnnuleringsBevestiging({
      naar: booking.email,
      naam: booking.naam,
      kapperNaam: barber?.naam ?? 'de kapper',
      service: booking.service,
      datum: booking.datum,
      tijd: booking.tijd,
    })
  } catch { /* mail fout mag annulering niet blokkeren */ }

  return Response.json({ ok: true })
}
