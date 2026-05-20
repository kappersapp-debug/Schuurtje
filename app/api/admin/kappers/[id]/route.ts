export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'
import { hash } from 'bcryptjs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Ongeldig verzoek' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.naam) update.naam = body.naam.trim()
  if (body.bio !== undefined) update.bio = body.bio
  if (typeof body.actief === 'boolean') update.actief = body.actief
  if (body.wachtwoord) update.password_hash = await hash(body.wachtwoord, 12)

  const { error } = await supabaseAdmin.from('barbers').update(update).eq('id', id)
  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const { error } = await supabaseAdmin.from('barbers').delete().eq('id', id)
  if (error) return Response.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}
