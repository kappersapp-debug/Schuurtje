'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Kapper = { id: string; naam: string; slug: string; bio: string | null; foto_url: string | null }

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}
function setCookie(name: string, value: string) {
  const exp = new Date(Date.now() + 365 * 86400000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`
}

function Avatar({ k, size }: { k: Kapper; size: number }) {
  return (
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden flex-shrink-0 bg-[#1e1e1e]">
      {k.foto_url ? (
        <Image src={k.foto_url} alt={k.naam} width={size} height={size} className="object-cover w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-black text-gray-500" style={{ fontSize: size * 0.4 }}>
          {k.naam[0]}
        </div>
      )}
    </div>
  )
}

export default function HomeClient({ kappers }: { kappers: Kapper[] }) {
  const [search, setSearch] = useState('')
  const [recentSlug, setRecentSlug] = useState<string | null>(null)

  useEffect(() => { setRecentSlug(getCookie('recent_kapper')) }, [])

  const recentKapper = recentSlug ? kappers.find(k => k.slug === recentSlug) ?? null : null

  const filtered = search.trim()
    ? kappers.filter(k =>
        k.naam.toLowerCase().includes(search.toLowerCase()) ||
        k.bio?.toLowerCase().includes(search.toLowerCase())
      )
    : kappers

  function handleClick(slug: string) {
    setCookie('recent_kapper', slug)
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] font-[family-name:var(--font-barlow)]">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[#141414]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2176d4]/8 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto px-4 pt-16 pb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[#2176d4] text-3xl">✂</span>
            <h1 className="text-6xl font-[family-name:var(--font-bebas)] tracking-widest text-white leading-none">
              Schuurtje
            </h1>
          </div>
          <p className="text-gray-500 text-base ml-1">Kies jouw kapper en maak direct een afspraak.</p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Recente kapper */}
        {recentKapper && (
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-2">Recente kapper</p>
            <Link href={`/${recentKapper.slug}`} onClick={() => handleClick(recentKapper.slug)}
              className="flex items-center gap-4 p-4 rounded-2xl border border-[#2176d4]/30 bg-[#2176d4]/5 hover:bg-[#2176d4]/10 hover:border-[#2176d4]/50 transition-all group">
              <Avatar k={recentKapper} size={52} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white group-hover:text-[#2176d4] transition-colors">{recentKapper.naam}</p>
                {recentKapper.bio && <p className="text-sm text-gray-500 truncate">{recentKapper.bio}</p>}
              </div>
              <span className="shrink-0 px-3 py-1.5 rounded-xl bg-[#2176d4] text-white text-xs font-bold">
                Boek direct
              </span>
            </Link>
          </div>
        )}

        {/* Zoekbalk */}
        {kappers.length > 3 && (
          <div className="relative mb-5">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Zoek een kapper..."
              className="w-full bg-[#141414] border border-[#2a2a2a] text-white placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#2176d4]/60 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-lg leading-none">×</button>
            )}
          </div>
        )}

        {/* Kappers lijst */}
        {filtered.length === 0 ? (
          <p className="text-center text-gray-600 py-12">Geen kappers gevonden voor &ldquo;{search}&rdquo;</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(k => (
              <Link key={k.id} href={`/${k.slug}`} onClick={() => handleClick(k.slug)}
                className="flex items-center gap-4 p-4 rounded-2xl border border-[#222] bg-[#141414] hover:border-[#2176d4]/40 hover:bg-[#2176d4]/5 transition-all group">
                <Avatar k={k} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white group-hover:text-[#2176d4] transition-colors">{k.naam}</p>
                  {k.bio
                    ? <p className="text-sm text-gray-500 truncate mt-0.5">{k.bio}</p>
                    : <p className="text-sm text-gray-700 mt-0.5">Kapper</p>
                  }
                </div>
                <svg className="w-4 h-4 text-gray-700 group-hover:text-[#2176d4] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            ))}
          </div>
        )}

        {!kappers.length && (
          <p className="text-gray-600 text-center py-16">Er zijn momenteel geen kappers beschikbaar.</p>
        )}
      </main>
    </div>
  )
}
