export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('reviews')
    .select('id, naam, rating, tekst, created_at')
    .eq('barber_id', session.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const reviews = data ?? []
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null

  return Response.json({ reviews, gemiddelde: avg, totaal: reviews.length })
}
