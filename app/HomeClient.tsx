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
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden flex-shrink-0 bg-[#1e1e1e] ring-2 ring-[#2a2a2a]">
      {k.foto_url ? (
        <Image src={k.foto_url} alt={k.naam} width={size} height={size} className="object-cover w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-black text-gray-500" style={{ fontSize: size * 0.38 }}>
          {k.naam[0]}
        </div>
      )}
    </div>
  )
}

export default function HomeClient({ kappers }: { kappers: Kapper[] }) {
  const [search, setSearch] = useState('')
  const [recentSlug, setRecentSlug] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setRecentSlug(getCookie('recent_kapper'))
    setMounted(true)
  }, [])

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
      <div className="relative overflow-hidden">
        {/* Background decoratie */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#2176d4]/10 rounded-full blur-[80px]" />
          <div className="absolute top-8 left-8 text-[120px] font-black text-white/[0.02] select-none leading-none font-[family-name:var(--font-bebas)] tracking-widest">✂</div>
        </div>
        <div className="relative max-w-2xl mx-auto px-4 pt-20 pb-14 text-center">
          <div className="inline-flex items-center gap-2 bg-[#2176d4]/10 border border-[#2176d4]/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-[#2176d4] text-sm">✂</span>
            <span className="text-[#2176d4] text-xs font-bold tracking-wider uppercase">Barbershop</span>
          </div>
          <h1 className="text-7xl sm:text-8xl font-[family-name:var(--font-bebas)] tracking-widest text-white leading-none mb-4">
            Schuurtje
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-sm mx-auto">
            Kies jouw kapper en maak direct een afspraak.
          </p>
          {kappers.length > 0 && (
            <p className="text-[#2176d4]/60 text-sm font-semibold mt-3">
              {kappers.length} {kappers.length === 1 ? 'kapper beschikbaar' : 'kappers beschikbaar'}
            </p>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2176d4]/20 to-transparent" />
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Recente kapper */}
        {mounted && recentKapper && (
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2176d4]" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600">Recente kapper</p>
            </div>
            <Link href={`/${recentKapper.slug}`} onClick={() => handleClick(recentKapper.slug)}
              className="flex items-center gap-4 p-4 rounded-2xl border border-[#2176d4]/25 bg-gradient-to-r from-[#2176d4]/8 to-transparent hover:from-[#2176d4]/12 hover:border-[#2176d4]/40 transition-all group">
              <Avatar k={recentKapper} size={54} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base">{recentKapper.naam}</p>
                {recentKapper.bio
                  ? <p className="text-sm text-gray-500 truncate mt-0.5">{recentKapper.bio}</p>
                  : <p className="text-sm text-gray-600 mt-0.5">Kapper</p>
                }
              </div>
              <span className="shrink-0 px-4 py-2 rounded-xl bg-[#2176d4] text-white text-sm font-bold group-hover:bg-[#3080e0] transition-colors shadow-lg shadow-[#2176d4]/20">
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
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Zoek een kapper..."
              className="w-full bg-[#141414] border border-[#222] text-white placeholder-gray-600 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-[#2176d4]/50 transition-colors" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors rounded-full hover:bg-white/10 text-sm">
                ×
              </button>
            )}
          </div>
        )}

        {/* Sectie label */}
        {!search && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600">
              {recentKapper ? 'Alle kappers' : 'Onze kappers'}
            </p>
          </div>
        )}

        {/* Kappers grid */}
        {kappers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">✂</p>
            <p className="text-gray-600 font-medium">Er zijn momenteel geen kappers beschikbaar.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            Geen kappers gevonden voor <span className="text-gray-400">&ldquo;{search}&rdquo;</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((k, i) => (
              <Link key={k.id} href={`/${k.slug}`} onClick={() => handleClick(k.slug)}
                style={{ animationDelay: `${i * 40}ms` }}
                className="flex items-center gap-4 p-4 rounded-2xl border border-[#1e1e1e] bg-[#141414] hover:border-[#2176d4]/30 hover:bg-[#2176d4]/5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 transition-all duration-200 group">
                <Avatar k={k} size={50} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white group-hover:text-[#2176d4] transition-colors">{k.naam}</p>
                  <p className="text-sm text-gray-600 truncate mt-0.5">{k.bio ?? 'Kapper'}</p>
                </div>
                <div className="shrink-0 w-8 h-8 rounded-xl bg-[#1e1e1e] group-hover:bg-[#2176d4]/15 flex items-center justify-center transition-colors">
                  <svg className="w-3.5 h-3.5 text-gray-700 group-hover:text-[#2176d4] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
