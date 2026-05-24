import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { nlVandaag } from '@/lib/slots'
import type { Service } from '@/lib/types'
import type { Metadata } from 'next'
import BookingForm from './BookingForm'
import AnnuleerVerzet from './AnnuleerVerzet'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: barber } = await supabaseAdmin
    .from('barbers').select('naam, bio').eq('slug', slug).eq('actief', true).single()
  if (!barber) return { title: 'Kapper niet gevonden' }
  const desc = barber.bio ? `${barber.bio} — Boek online bij ${barber.naam}` : `Boek online een afspraak bij ${barber.naam}. Direct beschikbaarheid zien, geen wachttijden.`
  return {
    title: `${barber.naam} — Afspraak boeken`,
    description: desc,
    openGraph: {
      title: `Boek bij ${barber.naam}`,
      description: desc,
      type: 'website',
    },
  }
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default async function KapperPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ annuleer?: string; verzet?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const annuleerCode = sp.annuleer?.toUpperCase()
  const verzetCode = sp.verzet?.toUpperCase()

  const { data: barber } = await supabaseAdmin
    .from('barbers')
    .select('id, naam, slug, bio, foto_url')
    .eq('slug', slug)
    .eq('actief', true)
    .single()

  if (!barber) notFound()

  const vandaag = nlVandaag()
  const dertigDagenGeleden = addDays(vandaag, -30)

  const [{ data: settingsRows }, { data: reviewRows }, { data: boekingCounts }] = await Promise.all([
    supabaseAdmin.from('settings').select('key, value').eq('barber_id', barber.id).in('key', ['diensten']),
    supabaseAdmin.from('reviews').select('id, naam, rating, tekst, created_at').eq('barber_id', barber.id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('bookings').select('service').eq('barber_id', barber.id).eq('geannuleerd', false).gte('datum', dertigDagenGeleden).lte('datum', vandaag),
  ])

  const map = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const diensten: Service[] = JSON.parse(map.diensten ?? '[]')

  const reviews = (reviewRows ?? []) as { id: string; naam: string; rating: number; tekst: string | null; created_at: string }[]

  const teller: Record<string, number> = {}
  for (const b of boekingCounts ?? []) {
    teller[b.service] = (teller[b.service] ?? 0) + 1
  }
  const meestGeboektNaam = Object.entries(teller).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const meestGeboektId = meestGeboektNaam ? (diensten.find(d => d.naam === meestGeboektNaam)?.id ?? null) : null

  if (annuleerCode || verzetCode) {
    return (
      <AnnuleerVerzet
        slug={slug}
        barberNaam={barber.naam}
        annuleerCode={annuleerCode}
        verzetCode={verzetCode}
        diensten={diensten}
      />
    )
  }

  return (
    <BookingForm
      slug={slug}
      diensten={diensten}
      barberNaam={barber.naam}
      barberBio={barber.bio ?? undefined}
      barberFoto={barber.foto_url ?? undefined}
      reviews={reviews}
      meestGeboektId={meestGeboektId}
    />
  )
}
