'use client'

import { useEffect, useState } from 'react'

type Kapper = { id: string; naam: string; slug: string; email: string; actief: boolean; created_at: string }

export default function AdminKappersPage() {
  const [kappers, setKappers] = useState<Kapper[]>([])
  const [laden, setLaden] = useState(true)
  const [toonForm, setToonForm] = useState(false)
  const [naam, setNaam] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [bio, setBio] = useState('')
  const [opslaan, setOpslaan] = useState(false)
  const [fout, setFout] = useState('')

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

  async function voegToe(e: React.FormEvent) {
    e.preventDefault()
    setOpslaan(true)
    setFout('')
    try {
      const res = await fetch('/api/admin/kappers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam, slug, email, wachtwoord, bio }),
      })
      const data = await res.json()
      if (!res.ok) { setFout(data.error ?? 'Fout'); return }
      setToonForm(false)
      setNaam(''); setSlug(''); setEmail(''); setWachtwoord(''); setBio('')
      laad()
    } finally {
      setOpslaan(false)
    }
  }

  async function toggleActief(id: string, actief: boolean) {
    await fetch(`/api/admin/kappers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actief: !actief }),
    })
    laad()
  }

  async function verwijder(id: string, naam: string) {
    if (!confirm(`${naam} definitief verwijderen? Dit verwijdert ook alle afspraken.`)) return
    await fetch(`/api/admin/kappers/${id}`, { method: 'DELETE' })
    laad()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kappers</h1>
        <button
          onClick={() => setToonForm((v) => !v)}
          className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm hover:bg-zinc-700"
        >
          + Kapper toevoegen
        </button>
      </div>

      {toonForm && (
        <form onSubmit={voegToe} className="rounded-2xl border border-zinc-200 p-5 space-y-3">
          <h2 className="font-semibold">Nieuwe kapper</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Naam *" value={naam} onChange={(e) => { setNaam(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) }} required className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-900" />
            <input placeholder="Slug (URL) *" value={slug} onChange={(e) => setSlug(e.target.value)} required className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-900" />
            <input type="email" placeholder="E-mailadres *" value={email} onChange={(e) => setEmail(e.target.value)} required className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-900" />
            <input type="password" placeholder="Wachtwoord *" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)} required className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-900" />
          </div>
          <textarea placeholder="Bio (optioneel)" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 resize-none" />
          {fout && <p className="text-red-500 text-sm">{fout}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={opslaan} className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm hover:bg-zinc-700 disabled:opacity-50">
              {opslaan ? 'Opslaan...' : 'Toevoegen'}
            </button>
            <button type="button" onClick={() => setToonForm(false)} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm hover:bg-zinc-50">
              Annuleer
            </button>
          </div>
        </form>
      )}

      {laden && <p className="text-zinc-400 text-sm">Laden...</p>}

      <div className="space-y-2">
        {kappers.map((k) => (
          <div key={k.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${!k.actief ? 'opacity-50 border-zinc-100' : 'border-zinc-200'}`}>
            <div>
              <p className="font-medium">{k.naam} <span className="text-zinc-400 font-normal text-sm">/{k.slug}</span></p>
              <p className="text-sm text-zinc-500">{k.email}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleActief(k.id, k.actief)}
                className="text-xs px-3 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50"
              >
                {k.actief ? 'Deactiveer' : 'Activeer'}
              </button>
              <button
                onClick={() => verwijder(k.id, k.naam)}
                className="text-xs px-3 py-1 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              >
                Verwijder
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
