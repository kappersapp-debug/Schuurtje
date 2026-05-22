export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('barbers')
    .select('naam, bio, foto_url')
    .eq('id', session.id)
    .single()

  return Response.json({ profiel: data })
}

export async function POST(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Ongeldig verzoek' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.naam?.trim()) update.naam = body.naam.trim()
  if (body.bio !== undefined) update.bio = body.bio?.trim() || null

  if (Object.keys(update).length === 0) return Response.json({ ok: true })

  const { error } = await supabaseAdmin.from('barbers').update(update).eq('id', session.id)
  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}
