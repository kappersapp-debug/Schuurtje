export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { generateCode, nlVandaag } from '@/lib/slots'
import { stuurWachtlijstBevestiging } from '@/lib/mailer'

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const yesterday = new Date(Date.now() - 86400000).toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).split(' ')[0]
  await supabaseAdmin.from('waitlist').delete().eq('barber_id', session.id).lt('datum', yesterday)

  const { data, error } = await supabaseAdmin
    .from('waitlist').select('*')
    .eq('barber_id', session.id)
    .order('datum').order('created_at')

  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })
  return Response.json({ wachtlijst: data })
}

// Portal: assign waitlist entry to a slot
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  const body = await req.json().catch(() => null)

  // Portaal assign (has wachtlijst_id)
  if (body?.wachtlijst_id) {
    const session = await getKapperSession()
    if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { wachtlijst_id, datum, tijd, service, prijs, duur } = body
    if (!wachtlijst_id || !datum || !tijd || !service) {
      return Response.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
    }

    const { data: entry } = await supabaseAdmin
      .from('waitlist').select('*').eq('id', wachtlijst_id).eq('barber_id', session.id).single()
    if (!entry) return Response.json({ error: 'Wachtlijst entry niet gevonden' }, { status: 404 })

    // Check slot still available
    const { data: existing } = await supabaseAdmin.from('bookings').select('tijd, duur')
      .eq('barber_id', session.id).eq('datum', datum).eq('geannuleerd', false)
    const [th, tm] = tijd.split(':').map(Number)
    const tStart = th * 60 + tm
    const tEnd = tStart + (duur ?? 30)
    for (const b of existing ?? []) {
      const [bh, bm] = b.tijd.split(':').map(Number)
      const bStart = bh * 60 + bm
      if (bStart < tEnd && tStart < bStart + b.duur) {
        return Response.json({ error: 'Dit tijdslot is niet meer beschikbaar' }, { status: 409 })
      }
    }

    let code = generateCode()
    for (let i = 0; i < 5; i++) {
      const { data } = await supabaseAdmin.from('bookings').select('id').eq('code', code).single()
      if (!data) break
      code = generateCode()
    }

    const normEmail = entry.email ? entry.email.toLowerCase() : ''
    const { error: insertError } = await supabaseAdmin.from('bookings').insert({
      barber_id: session.id, code, naam: entry.naam, telefoon: entry.telefoon ?? '',
      email: normEmail, service, prijs: prijs ?? 0, duur: duur ?? 30, datum, tijd, notities: null,
    })
    if (insertError) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })

    await supabaseAdmin.from('waitlist').delete().eq('id', wachtlijst_id)

    if (normEmail) {
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
      const { data: barber } = await supabaseAdmin.from('barbers').select('naam, slug').eq('id', session.id).single()
      stuurWachtlijstBevestiging({
        naar: normEmail, naam: entry.naam, kapperNaam: barber?.naam ?? 'de kapper',
        service, datum, tijd, prijs: prijs ?? 0, code, slug: barber?.slug ?? '', baseUrl: base,
      }).catch(() => {})
    }

    return Response.json({ ok: true, code })
  }

  // Public: join waitlist
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`wachtlijst:${ip}`, 5, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const { slug, naam, email, telefoon, service, datum } = body ?? {}
  if (!slug || !naam || !email || !telefoon || !service || !datum) {
    return Response.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }

  const { data: barber } = await supabaseAdmin
    .from('barbers').select('id').eq('slug', slug).eq('actief', true).single()
  if (!barber) return Response.json({ error: 'Kapper niet gevonden' }, { status: 404 })

  const { error } = await supabaseAdmin.from('waitlist').insert({
    barber_id: barber.id, naam: naam.trim(),
    email: email.toLowerCase().trim(), telefoon: telefoon.trim(), service, datum,
  })
  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'id verplicht' }, { status: 400 })

  const { error } = await supabaseAdmin.from('waitlist').delete().eq('id', id).eq('barber_id', session.id)
  if (error) return Response.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}
