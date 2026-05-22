export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase()
  if (!code) return Response.json({ error: 'Code vereist' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings').select('id, naam, service, barber_id, geannuleerd').eq('code', code).single()
  if (!booking) return Response.json({ error: 'Boeking niet gevonden' }, { status: 404 })
  if (booking.geannuleerd) return Response.json({ error: 'Geannuleerde boeking' }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from('reviews').select('id').eq('booking_code', code).single()
  if (existing) return Response.json({ error: 'Al beoordeeld' }, { status: 409 })

  return Response.json({ ok: true, naam: booking.naam, service: booking.service })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { code, rating, tekst } = body ?? {}
  if (!code || !rating) return Response.json({ error: 'Code en rating vereist' }, { status: 400 })
  if (rating < 1 || rating > 5) return Response.json({ error: 'Rating 1-5' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings').select('id, naam, barber_id, geannuleerd').eq('code', code.toUpperCase()).single()
  if (!booking) return Response.json({ error: 'Boeking niet gevonden' }, { status: 404 })
  if (booking.geannuleerd) return Response.json({ error: 'Geannuleerde boeking' }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from('reviews').select('id').eq('booking_code', code.toUpperCase()).single()
  if (existing) return Response.json({ error: 'Al beoordeeld' }, { status: 409 })

  const { error } = await supabaseAdmin.from('reviews').insert({
    barber_id: booking.barber_id,
    booking_code: code.toUpperCase(),
    naam: booking.naam,
    rating,
    tekst: tekst?.trim() || null,
  })
  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return Response.json({ ok: true })
}
