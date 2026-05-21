import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { genereerSlots, nlVandaag, generateCode } from '@/lib/slots'
import { stuurBevestiging } from '@/lib/mailer'
import { rateLimit } from '@/lib/rate-limit'
import type { WeekSchedule, Service } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`boek:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const { slug, naam, email, telefoon, dienstId, datum, tijd, notities } = body ?? {}

  if (!slug || !naam || !email || !telefoon || !dienstId || !datum || !tijd) {
    return Response.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }
  if (datum < nlVandaag()) {
    return Response.json({ error: 'Datum ligt in het verleden' }, { status: 400 })
  }

  const { data: barber } = await supabaseAdmin
    .from('barbers')
    .select('id, naam')
    .eq('slug', slug)
    .eq('actief', true)
    .single()
  if (!barber) return Response.json({ error: 'Kapper niet gevonden' }, { status: 404 })

  // Check gebanned
  const { data: ban } = await supabaseAdmin
    .from('banned_emails')
    .select('id')
    .eq('barber_id', barber.id)
    .eq('email', email.toLowerCase().trim())
    .single()
  if (ban) return Response.json({ error: 'Boeken niet mogelijk' }, { status: 403 })

  const { data: settingsRows } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .eq('barber_id', barber.id)
    .in('key', ['schema', 'diensten'])

  const map = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const weekSchema: WeekSchedule = JSON.parse(map.schema ?? '{}')
  const diensten: Service[] = JSON.parse(map.diensten ?? '[]')
  const dienst = diensten.find((d) => d.id === dienstId)
  if (!dienst) return Response.json({ error: 'Dienst niet gevonden' }, { status: 404 })

  const { data: boekingen } = await supabaseAdmin
    .from('bookings')
    .select('tijd, duur')
    .eq('barber_id', barber.id)
    .eq('datum', datum)
    .eq('geannuleerd', false)

  const beschikbaar = genereerSlots(datum, weekSchema, dienst, boekingen ?? [])
  if (!beschikbaar.includes(tijd)) {
    return Response.json({ error: 'Dit tijdslot is niet meer beschikbaar' }, { status: 409 })
  }

  // Unieke code genereren
  let code = generateCode()
  for (let i = 0; i < 10; i++) {
    const { data } = await supabaseAdmin.from('bookings').select('id').eq('code', code).single()
    if (!data) break
    if (i === 9) return Response.json({ error: 'Probeer opnieuw' }, { status: 500 })
    code = generateCode()
  }

  const { error } = await supabaseAdmin.from('bookings').insert({
    barber_id: barber.id,
    code,
    naam: naam.trim(),
    email: email.toLowerCase().trim(),
    telefoon: telefoon.trim(),
    service: dienst.naam,
    prijs: dienst.prijs,
    datum,
    tijd,
    duur: dienst.duur,
    notities: notities?.trim() || null,
  })
  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  try {
    await stuurBevestiging({
      naar: email,
      naam,
      kapperNaam: barber.naam,
      service: dienst.naam,
      datum,
      tijd,
      prijs: dienst.prijs,
      code,
      slug,
      baseUrl,
    })
  } catch { /* mail fout mag boeking niet blokkeren */ }

  return Response.json({ ok: true, code })
}
