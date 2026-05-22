export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, barber_id, booking_code, naam, rating, tekst, created_at, barbers(naam)')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })
  return Response.json({ reviews: data })
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'ID vereist' }, { status: 400 })

  const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id)
  if (error) return Response.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}
