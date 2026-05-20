'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, wachtwoord }),
      })
      const data = await res.json()
      if (!res.ok) { setFout(data.error ?? 'Inloggen mislukt'); return }
      router.push('/admin/kappers')
    } finally {
      setLaden(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">Admin</h1>
        <p className="text-zinc-400 text-sm text-center mb-8">Schuurtje beheer</p>
        <form onSubmit={login} className="space-y-4">
          <input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-900"
          />
          <input
            type="password"
            placeholder="Wachtwoord"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-900"
          />
          {fout && <p className="text-red-500 text-sm">{fout}</p>}
          <button
            type="submit"
            disabled={laden}
            className="w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {laden ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}
