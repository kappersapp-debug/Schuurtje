'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type EersteSlot = { dag: string; tijd: string } | null
type Kapper = {
  id: string; naam: string; slug: string; bio: string | null; foto_url: string | null
  rating: number | null; aantalReviews: number; eersteSlot: EersteSlot
}

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
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden flex-shrink-0 bg-[#1e1e1e] border-2 border-[#2a2a2a]">
      {k.foto_url
        ? <Image src={k.foto_url} alt={k.naam} width={size} height={size} className="object-cover w-full h-full" unoptimized />
        : <div className="w-full h-full flex items-center justify-center font-black text-gray-500" style={{ fontSize: size * 0.38 }}>{k.naam[0].toUpperCase()}</div>
      }
    </div>
  )
}

function SlotBadge({ slot }: { slot: EersteSlot }) {
  if (!slot) return <span className="text-xs text-gray-600">Geen beschikbaarheid komende week</span>
  const isVandaag = slot.dag === 'Vandaag'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${isVandaag ? 'text-green-400' : 'text-gray-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isVandaag ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}/>
      Eerste slot: {slot.dag} {slot.tijd}
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

  const sorted = [...kappers].sort((a, b) => {
    const aVandaag = a.eersteSlot?.dag === 'Vandaag' ? 0 : a.eersteSlot ? 1 : 2
    const bVandaag = b.eersteSlot?.dag === 'Vandaag' ? 0 : b.eersteSlot ? 1 : 2
    if (aVandaag !== bVandaag) return aVandaag - bVandaag
    const aRating = a.rating ?? 0
    const bRating = b.rating ?? 0
    if (bRating !== aRating) return bRating - aRating
    return a.naam.localeCompare(b.naam)
  })

  const filtered = search.trim()
    ? sorted.filter(k =>
        k.naam.toLowerCase().includes(search.toLowerCase()) ||
        k.bio?.toLowerCase().includes(search.toLowerCase())
      )
    : sorted

  function handleClick(slug: string) {
    setCookie('recent_kapper', slug)
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] font-[family-name:var(--font-barlow)]">

      {/* Topbar */}
      <header className="border-b border-[#161616] px-6 h-14 flex items-center">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-2">
          <span className="text-[#2176d4] text-lg">✂</span>
          <span className="font-[family-name:var(--font-bebas)] tracking-widest text-white text-xl">Schuurtje</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4">

        {/* Hero */}
        <div className="py-10 border-b border-[#161616]">
          <h2 className="text-2xl font-bold text-white mb-1">Kies jouw kapper</h2>
          <p className="text-gray-500 text-sm">Online boeken zonder wachten. Direct beschikbaarheid zien.</p>
        </div>

        <div className="py-6 space-y-5">

          {/* Recente kapper */}
          {mounted && recentKapper && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-2.5">Welkom terug</p>
              <Link href={`/${recentKapper.slug}`} onClick={() => handleClick(recentKapper.slug)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[#2176d4] hover:bg-[#1d68be] transition-colors group">
                <Avatar k={recentKapper} size={52} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-base">{recentKapper.naam}</p>
                  <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                    {recentKapper.rating !== null && recentKapper.aantalReviews > 0 && (
                      <span className="text-amber-300 text-xs font-bold">★ {recentKapper.rating.toFixed(1)}</span>
                    )}
                    {recentKapper.eersteSlot && (
                      <span className={`text-xs font-semibold ${recentKapper.eersteSlot.dag === 'Vandaag' ? 'text-green-300' : 'text-blue-200'}`}>
                        {recentKapper.eersteSlot.dag} {recentKapper.eersteSlot.tijd}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
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
            <div className="space-y-3">
              {!search && (
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-1">
                  {kappers.length} {kappers.length === 1 ? 'kapper' : 'kappers'}
                </p>
              )}
              {filtered.map(k => (
                <Link key={k.id} href={`/${k.slug}`} onClick={() => handleClick(k.slug)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl border border-[#1c1c1c] bg-[#111] hover:border-[#2a2a2a] hover:bg-[#141414] transition-all group">
                  <Avatar k={k} size={56} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white text-base group-hover:text-[#2176d4] transition-colors">{k.naam}</p>
                      {k.rating !== null && k.aantalReviews > 0 && (
                        <span className="text-amber-400 text-xs font-bold">★ {k.rating.toFixed(1)} <span className="text-gray-600 font-normal">({k.aantalReviews})</span></span>
                      )}
                    </div>
                    {k.bio && <p className="text-xs text-gray-600 truncate">{k.bio}</p>}
                    <SlotBadge slot={k.eersteSlot} />
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

      <footer className="border-t border-[#161616] mt-4">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#2176d4] text-sm">✂</span>
            <span className="font-[family-name:var(--font-bebas)] tracking-widest text-gray-700 text-sm">Schuurtje</span>
          </div>
          <p className="text-gray-700 text-xs">© {new Date().getFullYear()} Schuurtje — Online kapper boeken</p>
        </div>
      </footer>
    </div>
  )
}
