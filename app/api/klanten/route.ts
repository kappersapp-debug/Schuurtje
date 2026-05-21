export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('email, naam, service, prijs, datum, tijd, code')
    .eq('barber_id', session.id)
    .eq('geannuleerd', false)
    .order('datum', { ascending: false })

  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })

  const map = new Map<string, {
    email: string; naam: string; bezoeken: number; totaalBesteed: number
    lastDate: string; lastService: string
    afspraken: typeof data
  }>()

  for (const b of (data ?? []).filter(b => b.email)) {
    const key = b.email.toLowerCase()
    if (!map.has(key)) {
      map.set(key, { email: key, naam: b.naam, bezoeken: 0, totaalBesteed: 0, lastDate: '', lastService: '', afspraken: [] })
    }
    const c = map.get(key)!
    c.bezoeken++
    c.totaalBesteed += b.prijs ?? 0
    c.afspraken!.push(b)
    if (b.datum > c.lastDate) {
      c.lastDate = b.datum
      c.lastService = b.service
      c.naam = b.naam
    }
  }

  const klanten = Array.from(map.values()).sort((a, b) => (b.lastDate > a.lastDate ? 1 : -1))
  return Response.json({ klanten })
}
