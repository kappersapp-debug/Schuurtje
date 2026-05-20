export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const url = new URL(req.url)
  const zoek = url.searchParams.get('q')?.toLowerCase()

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('naam, email, telefoon, datum')
    .eq('barber_id', session.id)
    .eq('geannuleerd', false)
    .order('datum', { ascending: false })

  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })

  // Deduplicate op email, meest recente datum bewaren
  const map = new Map<string, { naam: string; email: string; telefoon: string; laatste: string }>()
  for (const row of data ?? []) {
    const existing = map.get(row.email)
    if (!existing || row.datum > existing.laatste) {
      map.set(row.email, { naam: row.naam, email: row.email, telefoon: row.telefoon, laatste: row.datum })
    }
  }

  let klanten = Array.from(map.values()).sort((a, b) => a.naam.localeCompare(b.naam))
  if (zoek) {
    klanten = klanten.filter(
      (k) => k.naam.toLowerCase().includes(zoek) || k.email.toLowerCase().includes(zoek)
    )
  }

  return Response.json({ klanten })
}
