export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'
import { hash } from 'bcryptjs'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('barbers')
    .select('id, naam, slug, email, actief, created_at')
    .order('naam')

  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })
  return Response.json({ kappers: data })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { naam, slug, email, wachtwoord, bio } = body ?? {}
  if (!naam || !slug || !email || !wachtwoord) {
    return Response.json({ error: 'naam, slug, email en wachtwoord verplicht' }, { status: 400 })
  }

  const password_hash = await hash(wachtwoord, 12)
  const defaultSchedule = {
    0: { open: false, start: '09:00', end: '18:00', breaks: [] },
    1: { open: true, start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
    2: { open: true, start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
    3: { open: true, start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
    4: { open: true, start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
    5: { open: true, start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
    6: { open: false, start: '09:00', end: '18:00', breaks: [] },
  }
  const defaultDiensten = [
    { id: '1', naam: 'Knipbeurt', prijs: 20, duur: 30 },
    { id: '2', naam: 'Baard trimmen', prijs: 15, duur: 15 },
  ]

  const { data: barber, error } = await supabaseAdmin
    .from('barbers')
    .insert({ naam: naam.trim(), slug: slug.trim().toLowerCase(), email: email.toLowerCase().trim(), password_hash, bio: bio ?? null })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('settings').insert([
    { barber_id: barber.id, key: 'day_schedule', value: JSON.stringify(defaultSchedule) },
    { barber_id: barber.id, key: 'diensten', value: JSON.stringify(defaultDiensten) },
    { barber_id: barber.id, key: 'meldingen', value: 'true' },
    { barber_id: barber.id, key: 'herinneringen', value: 'true' },
  ])

  return Response.json({ ok: true, id: barber.id })
}
