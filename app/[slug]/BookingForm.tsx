'use client'

import { useState } from 'react'
import type { Service } from '@/lib/types'

export default function BookingForm({ slug, diensten }: { slug: string; diensten: Service[] }) {
  const [stap, setStap] = useState<'dienst' | 'datum' | 'tijd' | 'gegevens' | 'klaar'>('dienst')
  const [dienst, setDienst] = useState<Service | null>(null)
  const [datum, setDatum] = useState('')
  const [tijd, setTijd] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLaden, setSlotsLaden] = useState(false)
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [notities, setNotities] = useState('')
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState('')
  const [code, setCode] = useState('')

  const vandaag = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })

  async function laadSlots(d: string, s: Service) {
    setSlotsLaden(true)
    setSlots([])
    try {
      const res = await fetch(`/api/slots/${slug}?datum=${d}&dienst=${s.id}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
    } finally {
      setSlotsLaden(false)
    }
  }

  async function boek() {
    setLaden(true)
    setFout('')
    try {
      const res = await fetch('/api/boek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, naam, email, telefoon, dienstId: dienst!.id, datum, tijd, notities }),
      })
      const data = await res.json()
      if (!res.ok) { setFout(data.error ?? 'Fout'); return }
      setCode(data.code)
      setStap('klaar')
    } finally {
      setLaden(false)
    }
  }

  if (diensten.length === 0) {
    return <p className="text-zinc-400">Nog geen diensten beschikbaar.</p>
  }

  if (stap === 'klaar') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-2xl mb-2">Afspraak bevestigd!</p>
        <p className="text-zinc-600 mb-4">Je ontvangt een bevestigingsmail. Bewaar je code:</p>
        <p className="text-3xl font-bold tracking-widest text-green-700">{code}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stap 1: Dienst */}
      <section>
        <h2 className="font-semibold mb-3">1. Kies een dienst</h2>
        <div className="grid gap-2">
          {diensten.map((d) => (
            <button
              key={d.id}
              onClick={() => { setDienst(d); setDatum(''); setTijd(''); setSlots([]); setStap('datum') }}
              className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-all text-left ${
                dienst?.id === d.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <span>{d.naam}</span>
              <span className="text-sm opacity-70">€{d.prijs} · {d.duur} min</span>
            </button>
          ))}
        </div>
      </section>

      {/* Stap 2: Datum */}
      {(stap === 'datum' || stap === 'tijd' || stap === 'gegevens') && (
        <section>
          <h2 className="font-semibold mb-3">2. Kies een datum</h2>
          <input
            type="date"
            min={vandaag}
            value={datum}
            onChange={(e) => {
              setDatum(e.target.value)
              setTijd('')
              if (e.target.value && dienst) {
                laadSlots(e.target.value, dienst)
                setStap('tijd')
              }
            }}
            className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900"
          />
        </section>
      )}

      {/* Stap 3: Tijdslot */}
      {(stap === 'tijd' || stap === 'gegevens') && datum && (
        <section>
          <h2 className="font-semibold mb-3">3. Kies een tijd</h2>
          {slotsLaden && <p className="text-zinc-400 text-sm">Tijden laden...</p>}
          {!slotsLaden && slots.length === 0 && <p className="text-zinc-400 text-sm">Geen tijden beschikbaar op deze dag.</p>}
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button
                key={s}
                onClick={() => { setTijd(s); setStap('gegevens') }}
                className={`py-2 rounded-xl border text-sm transition-all ${
                  tijd === s ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Stap 4: Gegevens */}
      {stap === 'gegevens' && tijd && (
        <section>
          <h2 className="font-semibold mb-3">4. Jouw gegevens</h2>
          <div className="space-y-3">
            <input
              placeholder="Naam *"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900"
            />
            <input
              type="email"
              placeholder="E-mailadres *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900"
            />
            <input
              type="tel"
              placeholder="Telefoonnummer *"
              value={telefoon}
              onChange={(e) => setTelefoon(e.target.value)}
              className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900"
            />
            <textarea
              placeholder="Opmerkingen (optioneel)"
              value={notities}
              onChange={(e) => setNotities(e.target.value)}
              rows={3}
              className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900 resize-none"
            />
          </div>

          {fout && <p className="text-red-500 text-sm mt-2">{fout}</p>}

          <div className="mt-4 p-4 bg-zinc-50 rounded-xl text-sm text-zinc-600 space-y-1">
            <p><strong>{dienst?.naam}</strong> op {datum} om {tijd}</p>
            <p>€{dienst?.prijs} · {dienst?.duur} min</p>
          </div>

          <button
            onClick={boek}
            disabled={laden || !naam || !email || !telefoon}
            className="mt-4 w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {laden ? 'Bezig...' : 'Afspraak bevestigen'}
          </button>
        </section>
      )}
    </div>
  )
}
