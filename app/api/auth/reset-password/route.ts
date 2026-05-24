export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`reset:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const { token, wachtwoord } = await req.json().catch(() => ({}))
  if (!token || !wachtwoord || wachtwoord.length < 6) {
    return Response.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  // Find barber by token
  const { data: tokenRow } = await supabaseAdmin
    .from('settings').select('barber_id').eq('key', 'reset_token').eq('value', token).single()
  if (!tokenRow) return Response.json({ error: 'Ongeldige of verlopen link' }, { status: 400 })

  // Check expiry
  const { data: expiryRow } = await supabaseAdmin
    .from('settings').select('value').eq('barber_id', tokenRow.barber_id).eq('key', 'reset_expires').single()
  if (!expiryRow || new Date(expiryRow.value) < new Date()) {
    return Response.json({ error: 'Link is verlopen — vraag een nieuwe aan' }, { status: 400 })
  }

  // Update password
  await supabaseAdmin.from('barbers').update({ wachtwoord }).eq('id', tokenRow.barber_id)

  // Invalidate token
  await Promise.all([
    supabaseAdmin.from('settings').delete().eq('barber_id', tokenRow.barber_id).eq('key', 'reset_token'),
    supabaseAdmin.from('settings').delete().eq('barber_id', tokenRow.barber_id).eq('key', 'reset_expires'),
  ])

  return Response.json({ ok: true })
}
