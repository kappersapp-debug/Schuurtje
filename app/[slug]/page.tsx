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
      <main className="max-w-lg mx-auto w-full px-4 py-16">
        <h1 className="text-2xl font-bold mb-1">{barber.naam}</h1>
        <AnnuleerVerzet
          slug={slug}
          annuleerCode={annuleerCode}
          verzetCode={verzetCode}
          diensten={diensten}
        />
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-16">
      <a href="/" className="text-sm text-zinc-400 hover:text-zinc-600 mb-6 inline-block">← Alle kappers</a>
      <h1 className="text-3xl font-bold mb-1">{barber.naam}</h1>
      {barber.bio && <p className="text-zinc-500 mb-8">{barber.bio}</p>}
      <BookingForm slug={slug} diensten={diensten} />
    </main>
  )
}
