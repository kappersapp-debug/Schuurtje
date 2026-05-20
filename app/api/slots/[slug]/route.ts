export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { genereerSlots, nlVandaag } from '@/lib/slots'
import type { WeekSchedule, Service } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const url = new URL(req.url)
  const datum = url.searchParams.get('datum')
  const dienstId = url.searchParams.get('dienst')

  if (!datum || !dienstId) {
    return Response.json({ error: 'datum en dienst verplicht' }, { status: 400 })
  }
  if (datum < nlVandaag()) return Response.json({ slots: [] })

  const { data: barber } = await supabaseAdmin
    .from('barbers')
    .select('id')
    .eq('slug', slug)
    .eq('actief', true)
    .single()

  if (!barber) return Response.json({ error: 'Niet gevonden' }, { status: 404 })

  const { data: settingsRows } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .eq('barber_id', barber.id)
    .in('key', ['day_schedule', 'diensten'])

  const map = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const weekSchema: WeekSchedule = JSON.parse(map.day_schedule ?? '{}')
  const diensten: Service[] = JSON.parse(map.diensten ?? '[]')
  const dienst = diensten.find((d) => d.id === dienstId)
  if (!dienst) return Response.json({ error: 'Dienst niet gevonden' }, { status: 404 })

  const { data: boekingen } = await supabaseAdmin
    .from('bookings')
    .select('tijd, duur')
    .eq('barber_id', barber.id)
    .eq('datum', datum)
    .eq('geannuleerd', false)

  const slots = genereerSlots(datum, weekSchema, dienst, boekingen ?? [])
  return Response.json({ slots })
}
