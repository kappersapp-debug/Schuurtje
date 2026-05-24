export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).split(' ')[0]
  const [tyr, tmo, tdy] = todayStr.split('-').map(Number)

  const todayNlDate = new Date(tyr, tmo - 1, tdy, 12, 0, 0)
  const day = todayNlDate.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mondayNl = new Date(tyr, tmo - 1, tdy + diffToMon, 12, 0, 0)
  const sundayNl = new Date(tyr, tmo - 1, tdy + diffToMon + 6, 12, 0, 0)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const mondayStr = fmt(mondayNl)
  const sundayStr = fmt(sundayNl)

  const monthStart = `${tyr}-${String(tmo).padStart(2,'0')}-01`
  const nextMonthStart = tmo === 12 ? `${tyr+1}-01-01` : `${tyr}-${String(tmo+1).padStart(2,'0')}-01`

  // Last 7 days for revenue chart
  const dag7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(tyr, tmo - 1, tdy - 6 + i, 12, 0, 0)
    return fmt(d)
  })

  const [{ data: todayBookings }, { data: weekBookings }, { data: allBookings }, { data: monthBookings }, { data: dag7Bookings }] = await Promise.all([
    supabaseAdmin.from('bookings').select('*').eq('barber_id', session.id).eq('datum', todayStr).eq('geannuleerd', false),
    supabaseAdmin.from('bookings').select('prijs').eq('barber_id', session.id).eq('geannuleerd', false).gte('datum', mondayStr).lte('datum', sundayStr),
    supabaseAdmin.from('bookings').select('email').eq('barber_id', session.id).eq('geannuleerd', false),
    supabaseAdmin.from('bookings').select('email').eq('barber_id', session.id).eq('geannuleerd', false).gte('datum', monthStart).lt('datum', nextMonthStart),
    supabaseAdmin.from('bookings').select('datum, prijs').eq('barber_id', session.id).eq('geannuleerd', false).gte('datum', dag7[0]).lte('datum', dag7[6]),
  ])

  const weekOmzet = (weekBookings ?? []).reduce((sum, b) => sum + (b.prijs ?? 0), 0)
  const uniqueEmails = new Set((allBookings ?? []).map(b => b.email).filter(Boolean)).size
  const maandKlanten = new Set((monthBookings ?? []).map(b => b.email).filter(Boolean)).size

  const dagOmzet = dag7.map(datum => ({
    datum,
    omzet: (dag7Bookings ?? []).filter(b => b.datum === datum).reduce((s, b) => s + (b.prijs ?? 0), 0),
    label: new Date(datum + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short' }),
  }))

  return Response.json({
    vandaag: (todayBookings ?? []).length,
    week: (weekBookings ?? []).length,
    weekOmzet,
    totaalKlanten: uniqueEmails,
    maandKlanten,
    vandaagAfspraken: todayBookings ?? [],
    dagOmzet,
  })
}
