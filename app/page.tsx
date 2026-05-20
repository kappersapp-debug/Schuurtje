import { supabaseAdmin } from '@/lib/supabase'
import type { Barber } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data: kappers } = await supabaseAdmin
    .from('barbers')
    .select('id, naam, slug, bio, foto_url')
    .eq('actief', true)
    .order('naam')

  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-16">
      <h1 className="text-4xl font-bold mb-2">Schuurtje</h1>
      <p className="text-zinc-500 mb-12">Kies jouw kapper en boek een afspraak.</p>

      {!kappers?.length && (
        <p className="text-zinc-400">Er zijn momenteel geen kappers beschikbaar.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {kappers?.map((k: Pick<Barber, 'id' | 'naam' | 'slug' | 'bio' | 'foto_url'>) => (
          <Link
            key={k.id}
            href={`/${k.slug}`}
            className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 hover:border-zinc-400 hover:shadow-sm transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-zinc-100 overflow-hidden flex-shrink-0">
              {k.foto_url ? (
                <Image src={k.foto_url} alt={k.naam} width={56} height={56} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-400">
                  {k.naam[0]}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold">{k.naam}</p>
              {k.bio && <p className="text-sm text-zinc-500 line-clamp-2">{k.bio}</p>}
            </div>
          </Link>
        ))}
      </div>

      <footer className="mt-20 text-center text-xs text-zinc-400">
        <Link href="/portaal" className="hover:text-zinc-600">Kappers portaal</Link>
      </footer>
    </main>
  )
}
