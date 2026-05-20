'use client'

import { useEffect, useState } from 'react'

type Klant = { naam: string; email: string; telefoon: string; laatste: string }

export default function KlantenPage() {
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [laden, setLaden] = useState(true)
  const [zoek, setZoek] = useState('')

  async function laad(q?: string) {
    setLaden(true)
    try {
      const url = q ? `/api/klanten?q=${encodeURIComponent(q)}` : '/api/klanten'
      const res = await fetch(url)
      const data = await res.json()
      setKlanten(data.klanten ?? [])
    } finally {
      setLaden(false)
    }
  }

  useEffect(() => { laad() }, [])

  async function ban(email: string) {
    const reden = prompt(`Reden voor bannen van ${email}? (optioneel)`)
    if (reden === null) return
    await fetch('/api/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, reden }),
    })
    alert(`${email} is gebanned.`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Klanten</h1>

      <input
        placeholder="Zoek op naam of email..."
        value={zoek}
        onChange={(e) => { setZoek(e.target.value); laad(e.target.value) }}
        className="border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-900 w-full max-w-sm"
      />

      {laden && <p className="text-zinc-400 text-sm">Laden...</p>}
      {!laden && klanten.length === 0 && <p className="text-zinc-400 text-sm">Geen klanten gevonden.</p>}

      <div className="space-y-2">
        {klanten.map((k) => (
          <div key={k.email} className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
            <div>
              <p className="font-medium">{k.naam}</p>
              <p className="text-sm text-zinc-500">{k.email} · {k.telefoon}</p>
              <p className="text-xs text-zinc-400">Laatste afspraak: {k.laatste}</p>
            </div>
            <button
              onClick={() => ban(k.email)}
              className="text-xs px-3 py-1 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              Bannen
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
