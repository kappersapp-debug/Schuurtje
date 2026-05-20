'use client'

import { useEffect, useState } from 'react'
import type { Booking } from '@/lib/types'

export default function AfsprakenPage() {
  const [afspraken, setAfspraken] = useState<Booking[]>([])
  const [laden, setLaden] = useState(true)
  const [filter, setFilter] = useState<'aankomend' | 'alles'>('aankomend')
  const [zoek, setZoek] = useState('')

  const vandaag = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })

  async function laad() {
    setLaden(true)
    try {
      const res = await fetch('/api/afspraken')
      const data = await res.json()
      setAfspraken(data.afspraken ?? [])
    } finally {
      setLaden(false)
    }
  }

  useEffect(() => { laad() }, [])

  async function markeerNoShow(id: string, no_show: boolean) {
    await fetch(`/api/afspraken/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no_show }),
    })
    laad()
  }

  async function annuleer(id: string) {
    if (!confirm('Afspraak annuleren?')) return
    await fetch(`/api/afspraken/${id}`, { method: 'DELETE' })
    laad()
  }

  let lijst = afspraken
  if (filter === 'aankomend') lijst = lijst.filter((a) => a.datum >= vandaag)
  if (zoek) {
    const q = zoek.toLowerCase()
    lijst = lijst.filter((a) => a.naam.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Afspraken</h1>

      <div className="flex gap-2 flex-wrap">
        <div className="flex rounded-xl border border-zinc-200 overflow-hidden">
          {(['aankomend', 'alles'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm capitalize transition-colors ${filter === f ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          placeholder="Zoek op naam of email..."
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          className="border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-900 flex-1 min-w-48"
        />
      </div>

      {laden && <p className="text-zinc-400 text-sm">Laden...</p>}
      {!laden && lijst.length === 0 && <p className="text-zinc-400 text-sm">Geen afspraken gevonden.</p>}

      <div className="space-y-2">
        {lijst.map((a) => (
          <div key={a.id} className={`rounded-xl border px-4 py-3 ${a.no_show ? 'border-red-200 bg-red-50' : 'border-zinc-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{a.naam}</p>
                <p className="text-sm text-zinc-500">{a.service} · {a.duur} min · €{a.prijs}</p>
                <p className="text-sm text-zinc-400">{a.email} · {a.telefoon}</p>
                {a.notities && <p className="text-sm text-zinc-400 italic mt-1">{a.notities}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono text-sm">{a.datum} {a.tijd}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{a.code}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => markeerNoShow(a.id, !a.no_show)}
                className={`text-xs px-3 py-1 rounded-lg border transition-colors ${a.no_show ? 'border-red-300 bg-red-100 text-red-700' : 'border-zinc-200 hover:bg-zinc-50'}`}
              >
                {a.no_show ? 'No-show ongedaan' : 'No-show'}
              </button>
              <button
                onClick={() => annuleer(a.id)}
                className="text-xs px-3 py-1 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
              >
                Annuleer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
