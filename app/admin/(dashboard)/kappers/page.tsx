'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type Kapper = { id: string; naam: string; slug: string; email: string; bio: string | null; foto_url: string | null; actief: boolean; created_at: string }

function toSlug(naam: string) {
  return naam.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function KapperAvatar({ k, size }: { k: { naam: string; foto_url: string | null }; size: number }) {
  return (
    <div style={{ width: size, height: size }} className="rounded-xl overflow-hidden bg-[#1e1e1e] border border-[#2a2a2a] flex-shrink-0 flex items-center justify-center">
      {k.foto_url
        ? <Image src={k.foto_url} alt={k.naam} width={size} height={size} className="object-cover w-full h-full" unoptimized />
        : <span className="text-lg font-black text-gray-500">{k.naam[0]}</span>
      }
    </div>
  )
}

export default function AdminKappersPage() {
  const [kappers, setKappers] = useState<Kapper[]>([])
  const [laden, setLaden] = useState(true)

  // Aanmaken
  const [toonForm, setToonForm] = useState(false)
  const [naam, setNaam] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [bio, setBio] = useState('')
  const [toonPw, setToonPw] = useState(false)
  const [opslaan, setOpslaan] = useState(false)
  const [fout, setFout] = useState('')

  // Bewerken
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [editNaam, setEditNaam] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPw, setEditPw] = useState('')
  const [editToonPw, setEditToonPw] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editFout, setEditFout] = useState('')
  const [editFotoUrl, setEditFotoUrl] = useState<string | null>(null)
  const [fotoLoading, setFotoLoading] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  // Overig
  const [verwijderConfirm, setVerwijderConfirm] = useState<string | null>(null)
  const [actieLoading, setActieLoading] = useState<string | null>(null)

  async function laad() {
    setLaden(true)
    try {
      const res = await fetch('/api/admin/kappers')
      const data = await res.json()
      setKappers(data.kappers ?? [])
    } finally {
      setLaden(false)
    }
  }

  useEffect(() => { laad() }, [])

  function handleNaamChange(v: string) {
    setNaam(v)
    setSlug(toSlug(v))
  }

  async function voegToe(e: React.FormEvent) {
    e.preventDefault()
    setOpslaan(true); setFout('')
    try {
      const res = await fetch('/api/admin/kappers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam, slug, email, wachtwoord, bio }),
      })
      const data = await res.json()
      if (!res.ok) { setFout(data.error ?? 'Fout bij aanmaken'); return }
      setToonForm(false)
      setNaam(''); setSlug(''); setEmail(''); setWachtwoord(''); setBio('')
      laad()
    } finally {
      setOpslaan(false)
    }
  }

  function startBewerk(k: Kapper) {
    setBewerkId(k.id)
    setEditNaam(k.naam)
    setEditSlug(k.slug)
    setEditEmail(k.email)
    setEditBio(k.bio ?? '')
    setEditPw('')
    setEditFout('')
    setEditFotoUrl(k.foto_url)
  }

  async function slaBewerk(e: React.FormEvent) {
    e.preventDefault()
    if (!bewerkId) return
    setEditSaving(true); setEditFout('')
    try {
      const body: Record<string, string> = { naam: editNaam, slug: editSlug, email: editEmail, bio: editBio }
      if (editPw) body.wachtwoord = editPw
      const res = await fetch(`/api/admin/kappers/${bewerkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setEditFout('Opslaan mislukt'); return }
      setBewerkId(null)
      laad()
    } finally {
      setEditSaving(false)
    }
  }

  async function uploadFoto(file: File) {
    if (!bewerkId) return
    setFotoLoading(true)
    try {
      const fd = new FormData()
      fd.append('foto', file)
      const res = await fetch(`/api/admin/kappers/${bewerkId}/foto`, { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) setEditFotoUrl(data.foto_url)
      else setEditFout(data.error ?? 'Upload mislukt')
    } finally {
      setFotoLoading(false)
    }
  }

  async function toggleActief(id: string, actief: boolean) {
    setActieLoading(id)
    await fetch(`/api/admin/kappers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actief: !actief }),
    })
    setActieLoading(null)
    laad()
  }

  async function verwijder(id: string) {
    setActieLoading(id)
    await fetch(`/api/admin/kappers/${id}`, { method: 'DELETE' })
    setVerwijderConfirm(null)
    setActieLoading(null)
    laad()
  }

  const actief = kappers.filter(k => k.actief)
  const inactief = kappers.filter(k => !k.actief)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Kappers</h1>
          <p className="text-gray-600 text-sm mt-0.5">{kappers.length} kappers · {actief.length} actief</p>
        </div>
        <button onClick={() => { setToonForm(v => !v); setFout('') }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${toonForm ? 'bg-[#1e1e1e] text-gray-400 border border-[#2a2a2a]' : 'bg-[#2176d4] text-white hover:bg-[#3080e0]'}`}>
          {toonForm ? '✕ Annuleer' : '+ Kapper toevoegen'}
        </button>
      </div>

      {/* Aanmaken formulier */}
      {toonForm && (
        <div className="bg-[#141414] rounded-2xl border border-[#2a2a2a] p-6 mb-6">
          <h2 className="font-bold text-white mb-5">Nieuwe kapper</h2>
          <form onSubmit={voegToe} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Naam *</label>
                <input value={naam} onChange={e => handleNaamChange(e.target.value)} required placeholder="Ibrahim"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Slug (URL) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">schuurtje.nl/</span>
                  <input value={slug} onChange={e => setSlug(e.target.value)} required placeholder="ibrahim"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl pl-[88px] pr-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">E-mailadres *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ibrahim@mail.com"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Wachtwoord *</label>
                <div className="relative">
                  <input type={toonPw ? 'text' : 'password'} value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} required placeholder="••••••••"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 pr-16 text-sm focus:outline-none focus:border-[#2176d4] transition-colors" />
                  <button type="button" onClick={() => setToonPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-600 hover:text-gray-300 transition-colors">
                    {toonPw ? 'Verberg' : 'Toon'}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Bio <span className="normal-case font-normal text-gray-700">(optioneel)</span></label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="Korte beschrijving..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors resize-none" />
            </div>
            {fout && <div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm font-semibold">{fout}</div>}
            <button type="submit" disabled={opslaan}
              className="px-5 py-2.5 rounded-xl bg-[#2176d4] text-white text-sm font-bold hover:bg-[#3080e0] disabled:opacity-50 transition-all">
              {opslaan ? 'Aanmaken...' : 'Kapper aanmaken'}
            </button>
          </form>
        </div>
      )}

      {/* Lijst */}
      {laden ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : kappers.length === 0 ? (
        <div className="text-center py-16 text-gray-600">Nog geen kappers aangemaakt.</div>
      ) : (
        <div className="space-y-3">
          {[...actief, ...inactief].map(k => (
            <div key={k.id} className={`rounded-2xl border transition-all ${k.actief ? 'bg-[#141414] border-[#222]' : 'bg-[#111] border-[#1a1a1a] opacity-60'}`}>
              {/* Kapper rij */}
              <div className="flex items-center gap-4 p-4">
                <KapperAvatar k={k} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white">{k.naam}</p>
                    <span className="text-gray-600 text-sm font-mono">/{k.slug}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.actief ? 'bg-green-900/40 text-green-400 border border-green-800/40' : 'bg-[#1e1e1e] text-gray-600 border border-[#2a2a2a]'}`}>
                      {k.actief ? 'Actief' : 'Inactief'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{k.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => bewerkId === k.id ? setBewerkId(null) : startBewerk(k)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all border ${bewerkId === k.id ? 'border-[#2176d4]/50 text-[#2176d4] bg-[#2176d4]/10' : 'border-[#2a2a2a] text-gray-400 hover:border-[#2176d4]/50 hover:text-[#2176d4]'}`}>
                    {bewerkId === k.id ? 'Sluiten' : 'Bewerken'}
                  </button>
                  <button onClick={() => toggleActief(k.id, k.actief)} disabled={actieLoading === k.id}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-50 ${k.actief ? 'border border-[#2a2a2a] text-gray-400 hover:border-amber-700/50 hover:text-amber-400 hover:bg-amber-900/10' : 'border border-[#2a2a2a] text-gray-400 hover:border-green-700/50 hover:text-green-400 hover:bg-green-900/10'}`}>
                    {actieLoading === k.id ? '...' : k.actief ? 'Deactiveer' : 'Activeer'}
                  </button>
                  {verwijderConfirm === k.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">Zeker?</span>
                      <button onClick={() => verwijder(k.id)} disabled={actieLoading === k.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold bg-red-900/40 text-red-400 border border-red-800/40 hover:bg-red-900/60 disabled:opacity-50 transition-all">
                        {actieLoading === k.id ? '...' : 'Ja, verwijder'}
                      </button>
                      <button onClick={() => setVerwijderConfirm(null)}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold border border-[#2a2a2a] text-gray-500 hover:text-gray-300 transition-all">Nee</button>
                    </div>
                  ) : (
                    <button onClick={() => setVerwijderConfirm(k.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold border border-[#2a2a2a] text-gray-600 hover:border-red-800/50 hover:text-red-400 hover:bg-red-900/10 transition-all">
                      Verwijder
                    </button>
                  )}
                </div>
              </div>

              {/* Edit panel */}
              {bewerkId === k.id && (
                <div className="border-t border-[#1e1e1e] px-4 pb-4 pt-4">
                  <form onSubmit={slaBewerk} className="space-y-4">
                    {/* Foto */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center">
                          {editFotoUrl
                            ? <Image src={`${editFotoUrl}?t=${Date.now()}`} alt="" width={64} height={64} className="object-cover w-full h-full" unoptimized />
                            : <span className="text-2xl font-black text-gray-500">{k.naam[0]}</span>
                          }
                        </div>
                        {fotoLoading && (
                          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div>
                        <input ref={fotoRef} type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFoto(f) }} />
                        <button type="button" onClick={() => fotoRef.current?.click()} disabled={fotoLoading}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] transition-all disabled:opacity-50">
                          {fotoLoading ? 'Uploaden...' : 'Foto wijzigen'}
                        </button>
                        <p className="text-[10px] text-gray-700 mt-1">Max 5MB · JPG, PNG, WebP</p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Naam</label>
                        <input value={editNaam} onChange={e => setEditNaam(e.target.value)} required
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2176d4] transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Slug</label>
                        <input value={editSlug} onChange={e => setEditSlug(e.target.value)} required
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2176d4] transition-colors font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">E-mail</label>
                        <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2176d4] transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nieuw wachtwoord <span className="normal-case font-normal text-gray-700">(leeg = ongewijzigd)</span></label>
                        <div className="relative">
                          <input type={editToonPw ? 'text' : 'password'} value={editPw} onChange={e => setEditPw(e.target.value)} placeholder="••••••••"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2 pr-14 text-sm focus:outline-none focus:border-[#2176d4] transition-colors" />
                          <button type="button" onClick={() => setEditToonPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-600 hover:text-gray-300 transition-colors">
                            {editToonPw ? 'Verberg' : 'Toon'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bio</label>
                      <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={2} placeholder="Korte beschrijving..."
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2176d4] transition-colors resize-none" />
                    </div>

                    {editFout && <div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-2.5 text-sm font-semibold">{editFout}</div>}

                    <div className="flex gap-2">
                      <button type="submit" disabled={editSaving}
                        className="px-4 py-2 rounded-xl bg-[#2176d4] text-white text-sm font-bold hover:bg-[#3080e0] disabled:opacity-50 transition-all">
                        {editSaving ? 'Opslaan...' : 'Opslaan'}
                      </button>
                      <button type="button" onClick={() => setBewerkId(null)}
                        className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm font-bold hover:text-white transition-all">
                        Annuleer
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
