export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

function fmt(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`
}
function icsEsc(s: unknown) {
  return String(s ?? '').replace(/[\r\n]/g, ' ').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export async function GET(req: NextRequest) {
  // Check if this is a subscribe request (has token param) or a URL-fetch from portal
  const token = req.nextUrl.searchParams.get('token')

  if (token) {
    // Calendar client subscribe feed — validate against CRON_SECRET
    if (token !== process.env.CRON_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    const slugParam = req.nextUrl.searchParams.get('slug')
    if (!slugParam) return new Response('slug required', { status: 400 })

    const { data: barber } = await supabaseAdmin.from('barbers').select('id, naam').eq('slug', slugParam).single()
    if (!barber) return new Response('Not found', { status: 404 })

    const today = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).split(' ')[0]
    const { data: bookings } = await supabaseAdmin
      .from('bookings').select('code, naam, service, prijs, datum, tijd, duur, telefoon')
      .eq('barber_id', barber.id).eq('geannuleerd', false)
      .gte('datum', today).order('datum').order('tijd')

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

    const ics = ['BEGIN:VCALENDAR','VERSION:2.0',`PRODID:-//${icsEsc(barber.naam)}//NL`,'METHOD:PUBLISH',`X-WR-CALNAME:${icsEsc(barber.naam)} Afspraken`,'X-WR-TIMEZONE:Europe/Amsterdam','REFRESH-INTERVAL;VALUE=DURATION:PT1M','X-PUBLISHED-TTL:PT1M', vtimezone, ...events, 'END:VCALENDAR'].join('\r\n')

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache', 'Expires': '0',
      },
    })
  }

  // Portal: return the subscribe URL
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const url = `${base}/api/portaal/calendar-url?token=${process.env.CRON_SECRET}&slug=${session.slug}`
  return Response.json({ url })
}
