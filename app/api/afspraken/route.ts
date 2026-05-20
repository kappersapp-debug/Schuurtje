export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const url = new URL(req.url)
  const datum = url.searchParams.get('datum')
  const van = url.searchParams.get('van')
  const tot = url.searchParams.get('tot')

  let query = supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('barber_id', session.id)
    .eq('geannuleerd', false)
    .order('datum', { ascending: true })
    .order('tijd', { ascending: true })

  if (datum) {
    query = query.eq('datum', datum)
  } else if (van && tot) {
    query = query.gte('datum', van).lte('datum', tot)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })
  return Response.json({ afspraken: data })
}
