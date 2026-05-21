'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)
  const [toon, setToon] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true); setFout('')
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
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4 font-[family-name:var(--font-barlow)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#141414] border border-[#2a2a2a] mb-4">
            <span className="text-2xl">✂</span>
          </div>
          <h1 className="text-2xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Schuurtje Admin</h1>
          <p className="text-gray-600 text-sm mt-1">Beheerpaneel</p>
        </div>

        <div className="bg-[#141414] rounded-2xl border border-[#2a2a2a] p-6">
          {fout && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm font-semibold">{fout}</div>
          )}
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">E-mailadres</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                className="w-full bg-[#1a1a1a] border-2 border-[#2a2a2a] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2176d4] transition-colors placeholder-gray-700"
                placeholder="admin@schuurtje.nl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Wachtwoord</label>
              <div className="relative">
                <input type={toon ? 'text' : 'password'} value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} required
                  className="w-full bg-[#1a1a1a] border-2 border-[#2a2a2a] text-white rounded-xl px-4 py-3 pr-16 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setToon(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-600 hover:text-gray-300 transition-colors px-1">
                  {toon ? 'Verberg' : 'Toon'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={laden}
              className="w-full py-3 rounded-xl bg-[#2176d4] text-white font-bold hover:bg-[#3080e0] disabled:opacity-50 transition-all duration-200 mt-2">
              {laden ? 'Bezig...' : 'Inloggen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
