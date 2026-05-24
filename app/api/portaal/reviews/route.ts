export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const [{ data }, { data: repliesRow }] = await Promise.all([
    supabaseAdmin.from('reviews').select('id, naam, rating, tekst, created_at')
      .eq('barber_id', session.id).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('settings').select('value').eq('barber_id', session.id).eq('key', 'review_replies').single(),
  ])

  const reviews = data ?? []
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null
  const replies: Record<string, string> = JSON.parse(repliesRow?.value ?? '{}')

  return Response.json({ reviews, gemiddelde: avg, totaal: reviews.length, replies })
}

export async function POST(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { review_id, reply } = await req.json().catch(() => ({}))
  if (!review_id) return Response.json({ error: 'review_id vereist' }, { status: 400 })

  const { data: existing } = await supabaseAdmin.from('settings').select('value')
    .eq('barber_id', session.id).eq('key', 'review_replies').single()
  const replies: Record<string, string> = JSON.parse(existing?.value ?? '{}')

  if (reply?.trim()) replies[review_id] = reply.trim()
  else delete replies[review_id]

  await supabaseAdmin.from('settings')
    .upsert({ barber_id: session.id, key: 'review_replies', value: JSON.stringify(replies) }, { onConflict: 'barber_id,key' })

  return Response.json({ ok: true })
}
