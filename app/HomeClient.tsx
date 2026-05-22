'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Kapper = { id: string; naam: string; slug: string; bio: string | null; foto_url: string | null; rating: number | null; aantalReviews: number }

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
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden flex-shrink-0 bg-[#222]">
      {k.foto_url ? (
        <Image src={k.foto_url} alt={k.naam} width={size} height={size} className="object-cover w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-black text-gray-400" style={{ fontSize: size * 0.38 }}>
          {k.naam[0].toUpperCase()}
        </div>
      )}
    </div>
  )
}

function RatingBadge({ rating, aantal }: { rating: number; aantal: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-amber-400 font-bold shrink-0">
      ★ {rating.toFixed(1)}
      <span className="text-gray-600 font-normal">({aantal})</span>
    </span>
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

      {/* Topbar */}
      <header className="border-b border-[#161616] px-6 h-14 flex items-center">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-2">
          <span className="text-[#2176d4]">✂</span>
          <span className="font-[family-name:var(--font-bebas)] tracking-widest text-white text-xl">Schuurtje</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4">

        {/* Hero compact */}
        <div className="py-10 border-b border-[#161616]">
          <h2 className="text-2xl font-bold text-white mb-1">Kies jouw kapper</h2>
          <p className="text-gray-500 text-sm">Boek snel en eenvoudig een afspraak bij een van onze kappers.</p>
        </div>

        <div className="py-6 space-y-6">

          {/* Recente kapper */}
          {mounted && recentKapper && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-2.5">Welkom terug</p>
              <Link href={`/${recentKapper.slug}`} onClick={() => handleClick(recentKapper.slug)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[#2176d4] hover:bg-[#2870c8] transition-colors group">
                <Avatar k={recentKapper} size={46} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">{recentKapper.naam}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-blue-200/70 truncate">{recentKapper.bio ?? 'Kapper'}</p>
                    {recentKapper.rating !== null && recentKapper.aantalReviews > 0 && (
                      <span className="text-xs text-amber-300 font-bold shrink-0">★ {recentKapper.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  Boek direct →
                </span>
              </Link>
            </div>
          )}

          {/* Zoekbalk */}
          {kappers.length > 3 && (
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Zoek een kapper..."
                className="w-full bg-[#141414] border border-[#222] text-white placeholder-gray-600 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-[#2176d4]/60 transition-colors" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none">×</button>
              )}
            </div>
          )}

          {/* Kappers */}
          {kappers.length === 0 ? (
            <div className="text-center py-12 text-gray-600">Geen kappers beschikbaar.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600">Geen resultaten voor &ldquo;{search}&rdquo;</div>
          ) : (
            <div className="space-y-2">
              {!search && (
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">
                  {kappers.length} {kappers.length === 1 ? 'kapper' : 'kappers'}
                </p>
              )}
              {filtered.map(k => (
                <Link key={k.id} href={`/${k.slug}`} onClick={() => handleClick(k.slug)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[#1c1c1c] bg-[#111] hover:border-[#2a2a2a] hover:bg-[#161616] transition-all group">
                  <Avatar k={k} size={42} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white group-hover:text-[#2176d4] transition-colors">{k.naam}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {k.bio && <p className="text-xs text-gray-600 truncate">{k.bio}</p>}
                      {k.rating !== null && k.aantalReviews > 0 && (
                        <RatingBadge rating={k.rating} aantal={k.aantalReviews} />
                      )}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-700 group-hover:text-[#2176d4] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
