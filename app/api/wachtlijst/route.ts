export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { nlVandaag } from '@/lib/slots'

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .eq('barber_id', session.id)
    .gte('datum', nlVandaag())
    .order('datum')
    .order('created_at')

  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })
  return Response.json({ wachtlijst: data })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`wachtlijst:${ip}`, 5, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const { slug, naam, email, telefoon, service, datum } = body ?? {}
  if (!slug || !naam || !email || !telefoon || !service || !datum) {
    return Response.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }

  const { data: barber } = await supabaseAdmin
    .from('barbers')
    .select('id')
    .eq('slug', slug)
    .eq('actief', true)
    .single()
  if (!barber) return Response.json({ error: 'Kapper niet gevonden' }, { status: 404 })

  const { error } = await supabaseAdmin.from('waitlist').insert({
    barber_id: barber.id,
    naam: naam.trim(),
    email: email.toLowerCase().trim(),
    telefoon: telefoon.trim(),
    service,
    datum,
  })
  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'id verplicht' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('waitlist')
    .delete()
    .eq('id', id)
    .eq('barber_id', session.id)

  if (error) return Response.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}
