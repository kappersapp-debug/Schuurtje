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
    <div className="min-h-screen bg-[#0c0c0c] font-[family-name:var(--font-barlow)]">
      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-black text-white tracking-tight mb-2" style={{fontFamily:'var(--font-bebas)'}}>
            Schuurtje
          </h1>
          <p className="text-gray-500 text-base">Kies jouw kapper en boek een afspraak.</p>
        </div>

        {!kappers?.length && (
          <p className="text-gray-600 font-medium">Er zijn momenteel geen kappers beschikbaar.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {kappers?.map((k: Pick<Barber, 'id'|'naam'|'slug'|'bio'|'foto_url'>) => (
            <Link key={k.id} href={`/${k.slug}`}
              className="flex items-center gap-4 p-4 rounded-2xl border border-[#2a2a2a] bg-[#141414] hover:border-[#2176d4]/50 hover:bg-[#2176d4]/5 transition-all group">
              <div className="w-14 h-14 rounded-full bg-[#1a1a1a] overflow-hidden flex-shrink-0 ring-2 ring-[#2a2a2a] group-hover:ring-[#2176d4]/30 transition-all">
                {k.foto_url ? (
                  <Image src={k.foto_url} alt={k.naam} width={56} height={56} className="object-cover w-full h-full"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-600 group-hover:text-[#2176d4] transition-colors">
                    {k.naam[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white group-hover:text-[#2176d4] transition-colors">{k.naam}</p>
                {k.bio && <p className="text-sm text-gray-500 truncate">{k.bio}</p>}
              </div>
              <span className="ml-auto text-gray-700 group-hover:text-[#2176d4] transition-colors text-lg shrink-0">›</span>
            </Link>
          ))}
        </div>

        <footer className="mt-20 text-center">
          <Link href="/portaal" className="text-xs text-gray-700 hover:text-gray-500 transition-colors">
            Kappers portaal
          </Link>
        </footer>
      </main>
    </div>
  )
}
