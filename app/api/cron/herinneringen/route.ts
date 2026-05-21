import { supabaseAdmin } from '@/lib/supabase'
import { stuurHerinneringsMail } from '@/lib/mailer'

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: bookings } = await supabaseAdmin
    .from('bookings').select('*, barbers(naam, slug)')
    .eq('geannuleerd', false).eq('datum', tomorrowStr)

  if (!bookings || bookings.length === 0) {
    return Response.json({ verstuurd: 0 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  let verstuurd = 0

  for (const booking of bookings) {
    if (!booking.email) continue
    const barberNaam = (booking.barbers as { naam: string } | null)?.naam ?? 'de kapper'
    const barberSlug = (booking.barbers as { slug: string } | null)?.slug ?? ''
    try {
      await stuurHerinneringsMail({
        naar: booking.email,
        naam: booking.naam,
        kapperNaam: barberNaam,
        service: booking.service,
        datum: booking.datum,
        tijd: booking.tijd,
        prijs: booking.prijs ?? 0,
        code: booking.code,
        slug: barberSlug,
        baseUrl,
      })
      verstuurd++
    } catch { /* non-fatal */ }
  }

  return Response.json({ verstuurd, datum: tomorrowStr })
}
