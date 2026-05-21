export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'
import { randomUUID } from 'crypto'

function fmt(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`
}
function icsEsc(s: unknown) {
  return String(s ?? '').replace(/[\r\n]/g, ' ').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (token) {
    // Calendar app fetches feed — look up barber by their calendar token
    const { data: setting } = await supabaseAdmin
      .from('settings')
      .select('barber_id')
      .eq('key', 'calendar_token')
      .eq('value', token)
      .single()

    if (!setting) return new Response('Unauthorized', { status: 401 })

    const { data: barber } = await supabaseAdmin
      .from('barbers').select('id, naam').eq('id', setting.barber_id).single()
    if (!barber) return new Response('Not found', { status: 404 })

    const { data: bookings } = await supabaseAdmin
      .from('bookings').select('code, naam, service, prijs, datum, tijd, duur, telefoon')
      .eq('barber_id', barber.id).eq('geannuleerd', false)
      .order('datum').order('tijd')

    const now = fmt(new Date())
    const events = (bookings ?? []).map(b => {
      const [yr, mo, dy] = b.datum.split('-').map(Number)
      const [hr, mn] = b.tijd.split(':').map(Number)
      const start = new Date(yr, mo - 1, dy, hr, mn)
      const end = new Date(start.getTime() + b.duur * 60000)
      return [
        'BEGIN:VEVENT',
        `UID:${b.code}@schuurtje.nl`,
        `DTSTART;TZID=Europe/Amsterdam:${fmt(start)}`,
        `DTEND;TZID=Europe/Amsterdam:${fmt(end)}`,
        `SUMMARY:${icsEsc(b.naam)} – ${icsEsc(b.service)}`,
        `DESCRIPTION:Code: ${b.code}\\nDienst: ${icsEsc(b.service)}\\nPrijs: €${b.prijs}\\nTel: ${icsEsc(b.telefoon)}`,
        `LOCATION:${icsEsc(barber.naam)}`,
        `DTSTAMP:${now}Z`,
        `LAST-MODIFIED:${now}Z`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n')
    })

    const vtimezone = [
      'BEGIN:VTIMEZONE','TZID:Europe/Amsterdam',
      'BEGIN:STANDARD','TZOFFSETFROM:+0200','TZOFFSETTO:+0100','TZNAME:CET','DTSTART:19701025T030000','RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10','END:STANDARD',
      'BEGIN:DAYLIGHT','TZOFFSETFROM:+0100','TZOFFSETTO:+0200','TZNAME:CEST','DTSTART:19700329T020000','RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3','END:DAYLIGHT',
      'END:VTIMEZONE',
    ].join('\r\n')

    const ics = [
      'BEGIN:VCALENDAR','VERSION:2.0',
      `PRODID:-//${icsEsc(barber.naam)}//NL`,
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${icsEsc(barber.naam)} Afspraken`,
      'X-WR-TIMEZONE:Europe/Amsterdam',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      'X-PUBLISHED-TTL:PT15M',
      vtimezone, ...events,
      'END:VCALENDAR',
    ].join('\r\n')

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache', 'Expires': '0',
      },
    })
  }

  // Portal: geef de subscribe-URL terug, maak token aan als die nog niet bestaat
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: existing } = await supabaseAdmin
    .from('settings').select('value')
    .eq('barber_id', session.id).eq('key', 'calendar_token')
    .single()

  let calToken = existing?.value
  if (!calToken) {
    calToken = randomUUID()
    await supabaseAdmin.from('settings').upsert(
      { barber_id: session.id, key: 'calendar_token', value: calToken },
      { onConflict: 'barber_id,key' }
    )
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const url = `${base}/api/portaal/calendar-url?token=${calToken}`
  return Response.json({ url })
}
