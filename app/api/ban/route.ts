export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { email, reden } = await req.json().catch(() => ({}))
  if (!email) return Response.json({ error: 'email verplicht' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('banned_emails')
    .upsert(
      { barber_id: session.id, email: email.toLowerCase().trim(), reden: reden ?? null },
      { onConflict: 'barber_id,email' }
    )

  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { email } = await req.json().catch(() => ({}))
  if (!email) return Response.json({ error: 'email verplicht' }, { status: 400 })

  await supabaseAdmin
    .from('banned_emails')
    .delete()
    .eq('barber_id', session.id)
    .eq('email', email.toLowerCase().trim())

  return Response.json({ ok: true })
}
