import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { genereerSlots, nlVandaag } from '@/lib/slots'
import { stuurVerzetBevestiging } from '@/lib/mailer'
import { rateLimit } from '@/lib/rate-limit'
import type { WeekSchedule, Service } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`verzet:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const { code, datum, tijd } = body ?? {}
  if (!code || !datum || !tijd) {
    return Response.json({ error: 'code, datum en tijd verplicht' }, { status: 400 })
  }
  if (datum < nlVandaag()) {
    return Response.json({ error: 'Datum ligt in het verleden' }, { status: 400 })
  }

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

  const { data: settingsRows } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .eq('barber_id', booking.barber_id)
    .in('key', ['schema', 'diensten'])

  const map = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const weekSchema: WeekSchedule = JSON.parse(map.schema ?? '{}')
  const diensten: Service[] = JSON.parse(map.diensten ?? '[]')
  const dienst = diensten.find((d) => d.naam === booking.service)
  if (!dienst) return Response.json({ error: 'Dienst niet gevonden' }, { status: 404 })

  const { data: boekingen } = await supabaseAdmin
    .from('bookings')
    .select('tijd, duur')
    .eq('barber_id', booking.barber_id)
    .eq('datum', datum)
    .eq('geannuleerd', false)
    .neq('id', booking.id)

  const beschikbaar = genereerSlots(datum, weekSchema, dienst, boekingen ?? [])
  if (!beschikbaar.includes(tijd)) {
    return Response.json({ error: 'Dit tijdslot is niet beschikbaar' }, { status: 409 })
  }

  await supabaseAdmin.from('bookings').update({ datum, tijd }).eq('id', booking.id)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  try {
    await stuurVerzetBevestiging({
      naar: booking.email,
      naam: booking.naam,
      kapperNaam: barber?.naam ?? 'de kapper',
      service: booking.service,
      nieuweDatum: datum,
      nieuweTijd: tijd,
      prijs: booking.prijs ?? 0,
      code: code.toUpperCase(),
      slug: barber?.slug ?? '',
      baseUrl,
    })
  } catch { /* mail fout mag verzetting niet blokkeren */ }

  return Response.json({ ok: true })
}
