export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function fmt(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`
}
function esc(s: unknown) {
  return String(s ?? '').replace(/[\r\n]/g, ' ').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; code: string }> }
) {
  const { slug, code: rawCode } = await params
  const code = rawCode.replace(/\.ics$/i, '').toUpperCase()

  const { data: barber } = await supabaseAdmin
    .from('barbers')
    .select('id, naam')
    .eq('slug', slug)
    .single()
  if (!barber) return new Response('Not found', { status: 404 })

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('code, naam, service, prijs, datum, tijd, duur')
    .eq('code', code)
    .eq('barber_id', barber.id)
    .eq('geannuleerd', false)
    .single()
  if (!booking) return new Response('Not found', { status: 404 })

  const [yr, mo, dy] = booking.datum.split('-').map(Number)
  const [hr, mn] = booking.tijd.split(':').map(Number)
  const start = new Date(yr, mo - 1, dy, hr, mn)
  const end = new Date(start.getTime() + booking.duur * 60_000)
  const now = fmt(new Date())

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Schuurtje//NL',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.code}@schuurtje.nl`,
    `DTSTART;TZID=Europe/Amsterdam:${fmt(start)}`,
    `DTEND;TZID=Europe/Amsterdam:${fmt(end)}`,
    `SUMMARY:${esc(booking.service)} bij ${esc(barber.naam)}`,
    `DESCRIPTION:Boekingscode: ${booking.code}\\nNaam: ${esc(booking.naam)}\\nPrijs: €${booking.prijs}`,
    `LOCATION:${esc(barber.naam)}`,
    `DTSTAMP:${now}Z`,
    `LAST-MODIFIED:${now}Z`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
