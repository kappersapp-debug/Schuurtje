import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`verify-check:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Te veel pogingen' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const { email, code, slug } = body ?? {}
  if (!email || !code || !slug) return Response.json({ valid: false, error: 'Ongeldig verzoek' }, { status: 400 })

  const { data: barber } = await supabaseAdmin
    .from('barbers').select('id').eq('slug', slug).eq('actief', true).single()
  if (!barber) return Response.json({ valid: false }, { status: 404 })

  const { data } = await supabaseAdmin
    .from('verification_codes')
    .select('id, code_hash, expires_at, used')
    .eq('barber_id', barber.id)
    .eq('email', email.toLowerCase().trim())
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return Response.json({ valid: false, error: 'Code ongeldig of verlopen' })
  if (data.code_hash !== hashCode(code)) return Response.json({ valid: false, error: 'Onjuiste code' })

  await supabaseAdmin.from('verification_codes').update({ used: true }).eq('id', data.id)
  return Response.json({ valid: true })
}
