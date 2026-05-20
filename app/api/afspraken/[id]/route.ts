export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Ongeldig verzoek' }, { status: 400 })

  // Verifieer dat deze afspraak van deze kapper is
  const { data: existing } = await supabaseAdmin
    .from('bookings')
    .select('id, barber_id')
    .eq('id', id)
    .eq('barber_id', session.id)
    .single()

  if (!existing) return Response.json({ error: 'Niet gevonden' }, { status: 404 })

  const allowed: Record<string, unknown> = {}
  if (typeof body.no_show === 'boolean') allowed.no_show = body.no_show
  if (typeof body.notities === 'string') allowed.notities = body.notities

  const { error } = await supabaseAdmin.from('bookings').update(allowed).eq('id', id)
  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })

  return Response.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .eq('barber_id', session.id)
    .single()

  if (!booking) return Response.json({ error: 'Niet gevonden' }, { status: 404 })

  await supabaseAdmin.from('bookings').update({ geannuleerd: true }).eq('id', id)

  await supabaseAdmin.from('cancelled_bookings').insert({
    barber_id: session.id,
    code: booking.code,
    naam: booking.naam,
    email: booking.email,
    telefoon: booking.telefoon,
    service: booking.service,
    prijs: booking.prijs,
    datum: booking.datum,
    tijd: booking.tijd,
    duur: booking.duur,
    reden: 'Geannuleerd door kapper',
  })

  return Response.json({ ok: true })
}
