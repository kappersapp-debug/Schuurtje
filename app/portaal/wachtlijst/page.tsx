'use client'

import { useEffect, useState } from 'react'
import type { WaitlistEntry } from '@/lib/types'

export default function WachtlijstPage() {
  const [wachtlijst, setWachtlijst] = useState<WaitlistEntry[]>([])
  const [laden, setLaden] = useState(true)

  async function laad() {
    setLaden(true)
    try {
      const res = await fetch('/api/wachtlijst')
      const data = await res.json()
      setWachtlijst(data.wachtlijst ?? [])
    } finally {
      setLaden(false)
    }
  }

  useEffect(() => { laad() }, [])

  async function verwijder(id: string) {
    if (!confirm('Van wachtlijst verwijderen?')) return
    await fetch('/api/wachtlijst', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    laad()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wachtlijst</h1>

      {laden && <p className="text-zinc-400 text-sm">Laden...</p>}
      {!laden && wachtlijst.length === 0 && <p className="text-zinc-400 text-sm">Wachtlijst is leeg.</p>}

      <div className="space-y-2">
        {wachtlijst.map((w) => (
          <div key={w.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
            <div>
              <p className="font-medium">{w.naam}</p>
              <p className="text-sm text-zinc-500">{w.service} · gewenste datum: {w.datum}</p>
              <p className="text-sm text-zinc-400">{w.email} · {w.telefoon}</p>
            </div>
            <button
              onClick={() => verwijder(w.id)}
              className="text-xs px-3 py-1 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              Verwijder
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
