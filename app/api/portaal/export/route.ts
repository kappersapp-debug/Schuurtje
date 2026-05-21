export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

function fmt(dateStr: string, timeStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  return `${String(y)}${String(mo).padStart(2,'0')}${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}${String(m).padStart(2,'0')}00`
}

function fmtEnd(dateStr: string, timeStr: string, duration: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  const end = new Date(y, mo - 1, d, h, m + duration)
  return `${end.getFullYear()}${String(end.getMonth()+1).padStart(2,'0')}${String(end.getDate()).padStart(2,'0')}T${String(end.getHours()).padStart(2,'0')}${String(end.getMinutes()).padStart(2,'0')}00`
}

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: barber } = await supabaseAdmin.from('barbers').select('naam').eq('id', session.id).single()
  const kapperNaam = barber?.naam ?? 'Schuurtje'

  const { data: bookings } = await supabaseAdmin
    .from('bookings').select('*')
    .eq('barber_id', session.id).eq('geannuleerd', false)
    .order('datum').order('tijd')

  const now = fmt(new Date().toISOString().split('T')[0], `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`)

  const events = (bookings ?? []).map(b => [
    'BEGIN:VEVENT',
    `UID:${b.code}@schuurtje.nl`,
    `DTSTART:${fmt(b.datum, b.tijd)}`,
    `DTEND:${fmtEnd(b.datum, b.tijd, b.duur)}`,
    `SUMMARY:${b.service} – ${b.naam}`,
    `DESCRIPTION:Code: ${b.code}\\nTel: ${b.telefoon}\\nEmail: ${b.email}`,
    `LOCATION:${kapperNaam}`,
    `DTSTAMP:${now}`,
    'END:VEVENT',
  ].join('\r\n')).join('\r\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${kapperNaam}//NL`,
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${kapperNaam} Afspraken`,
    events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${session.slug}-afspraken.ics"`,
    },
  })
}
