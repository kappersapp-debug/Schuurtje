export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .eq('barber_id', session.id)

  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })
  const instellingen = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))
  return Response.json({ instellingen })
}

export async function POST(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.key || body?.value === undefined) {
    return Response.json({ error: 'key en value verplicht' }, { status: 400 })
  }

  const toegestaan = ['day_schedule', 'diensten', 'meldingen', 'herinneringen']
  if (!toegestaan.includes(body.key)) {
    return Response.json({ error: 'Ongeldige key' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert(
      { barber_id: session.id, key: body.key, value: typeof body.value === 'string' ? body.value : JSON.stringify(body.value) },
      { onConflict: 'barber_id,key' }
    )

  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}
