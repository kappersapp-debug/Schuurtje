export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { genereerSlots } from '@/lib/slots'
import type { WeekSchedule, Service } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const url = new URL(req.url)
  const jaar = Number(url.searchParams.get('jaar'))
  const maand = Number(url.searchParams.get('maand')) // 1-12
  const dienstId = url.searchParams.get('dienst')

  if (!jaar || !maand || !dienstId) {
    return Response.json({ error: 'jaar, maand en dienst verplicht' }, { status: 400 })
  }

  const { data: barber } = await supabaseAdmin
    .from('barbers').select('id').eq('slug', slug).eq('actief', true).single()
  if (!barber) return Response.json({ error: 'Niet gevonden' }, { status: 404 })

  const { data: settingsRows } = await supabaseAdmin
    .from('settings').select('key, value').eq('barber_id', barber.id)
    .in('key', ['schema', 'diensten', 'geblokkeerde_datums'])

  const map = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const weekSchema: WeekSchedule = JSON.parse(map.schema ?? '{}')
  const diensten: Service[] = JSON.parse(map.diensten ?? '[]')
  const geblokkeerd: string[] = JSON.parse(map.geblokkeerde_datums ?? '[]')
  const dienst = diensten.find((d) => d.id === dienstId)
  if (!dienst) return Response.json({ error: 'Dienst niet gevonden' }, { status: 404 })

  // Haal alle boekingen voor deze maand op
  const vanDatum = `${jaar}-${String(maand).padStart(2, '0')}-01`
  const totDatum = `${jaar}-${String(maand).padStart(2, '0')}-31`

  const { data: boekingen } = await supabaseAdmin
    .from('bookings').select('datum, tijd, duur')
    .eq('barber_id', barber.id).eq('geannuleerd', false)
    .gte('datum', vanDatum).lte('datum', totDatum)

  // Bereken beschikbaarheid per dag
  const dagenInMaand = new Date(jaar, maand, 0).getDate()
  const beschikbaarheid: Record<string, 'beschikbaar' | 'bijna_vol' | 'vol' | 'gesloten'> = {}

  for (let dag = 1; dag <= dagenInMaand; dag++) {
    const datum = `${jaar}-${String(maand).padStart(2, '0')}-${String(dag).padStart(2, '0')}`
    if (geblokkeerd.includes(datum)) { beschikbaarheid[datum] = 'gesloten'; continue }

    const dagBoekingen = (boekingen ?? []).filter((b) => b.datum === datum)
    const slots = genereerSlots(datum, weekSchema, dienst, dagBoekingen)

    if (slots.length === 0) beschikbaarheid[datum] = 'gesloten'
    else if (slots.length <= 2) beschikbaarheid[datum] = 'bijna_vol'
    else beschikbaarheid[datum] = 'beschikbaar'
  }

  return Response.json({ beschikbaarheid })
}
