import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Barber, Service } from '@/lib/types'
import BookingForm from './BookingForm'
import AnnuleerVerzet from './AnnuleerVerzet'

export const dynamic = 'force-dynamic'

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

  const { data: settingsRows } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .eq('barber_id', barber.id)
    .in('key', ['diensten'])

  const map = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const diensten: Service[] = JSON.parse(map.diensten ?? '[]')

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
    />
  )
}
