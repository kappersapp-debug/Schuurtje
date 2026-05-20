'use client'

import { useState } from 'react'
import type { Service } from '@/lib/types'

export default function AnnuleerVerzet({
  slug,
  annuleerCode,
  verzetCode,
  diensten,
}: {
  slug: string
  annuleerCode?: string
  verzetCode?: string
  diensten: Service[]
}) {
  const [gedaan, setGedaan] = useState(false)
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)

  // Verzet state
  const [datum, setDatum] = useState('')
  const [tijd, setTijd] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLaden, setSlotsLaden] = useState(false)

  const code = annuleerCode ?? verzetCode ?? ''
  const isAnnuleer = !!annuleerCode
  const vandaag = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })

  async function laadSlots(d: string) {
    if (!verzetCode) return
    setSlotsLaden(true)
    setSlots([])
    // We kennen de dienst niet direct, gebruik eerste dienst als fallback
    try {
      const res = await fetch(`/api/slots/${slug}?datum=${d}&dienst=${diensten[0]?.id ?? '1'}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
    } finally {
      setSlotsLaden(false)
    }
  }

  async function bevestig() {
    setLaden(true)
    setFout('')
    try {
      const url = isAnnuleer ? '/api/annuleer' : '/api/verzet'
      const body = isAnnuleer ? { code } : { code, datum, tijd }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setFout(data.error ?? 'Fout'); return }
      setGedaan(true)
    } finally {
      setLaden(false)
    }
  }

  if (gedaan) {
    return (
      <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-xl font-semibold">
          {isAnnuleer ? 'Afspraak geannuleerd' : 'Afspraak verzet'}
        </p>
        <p className="text-zinc-500 mt-2">Je ontvangt een bevestigingsmail.</p>
        <a href={`/${slug}`} className="mt-4 inline-block text-sm text-zinc-600 underline">Nieuwe afspraak maken</a>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600">
        <p>Code: <strong>{code}</strong></p>
        <p className="mt-1">{isAnnuleer ? 'Je staat op het punt je afspraak te annuleren.' : 'Kies een nieuwe datum en tijd.'}</p>
      </div>

      {!isAnnuleer && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Nieuwe datum</label>
            <input
              type="date"
              min={vandaag}
              value={datum}
              onChange={(e) => { setDatum(e.target.value); setTijd(''); laadSlots(e.target.value) }}
              className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900"
            />
          </div>
          {datum && (
            <div>
              <label className="block text-sm font-medium mb-2">Nieuwe tijd</label>
              {slotsLaden && <p className="text-zinc-400 text-sm">Laden...</p>}
              {!slotsLaden && slots.length === 0 && <p className="text-zinc-400 text-sm">Geen tijden beschikbaar.</p>}
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTijd(s)}
                    className={`py-2 rounded-xl border text-sm transition-all ${
                      tijd === s ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {fout && <p className="text-red-500 text-sm">{fout}</p>}

      <button
        onClick={bevestig}
        disabled={laden || (!isAnnuleer && (!datum || !tijd))}
        className="w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {laden ? 'Bezig...' : isAnnuleer ? 'Annuleer mijn afspraak' : 'Afspraak verzetten'}
      </button>
    </div>
  )
}
