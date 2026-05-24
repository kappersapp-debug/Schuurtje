'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [klaar, setKlaar] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setKlaar(true)
    } catch {
      setError('Netwerkfout — probeer opnieuw')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#141414] rounded-xl shadow-xl border border-[#2a2a2a] overflow-hidden">
        <div className="bg-[#111] px-8 py-8 text-center border-b border-[#1e1e1e]">
          <div className="w-16 h-16 rounded-full bg-[#2176d4]/15 border border-[#2176d4]/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-[#2176d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
            </svg>
          </div>
          <h1 className="text-white font-bold text-lg">Wachtwoord vergeten</h1>
          <p className="text-gray-500 text-xs mt-0.5">Schuurtje Portaal</p>
        </div>
        <div className="p-8">
          {klaar ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                <span className="text-green-400 text-xl">✓</span>
              </div>
              <p className="text-white font-bold">E-mail verzonden</p>
              <p className="text-gray-500 text-sm">Als er een account bestaat voor dit adres, ontvang je een reset-link. Controleer ook je spamfolder.</p>
              <Link href="/portaal" className="block w-full py-2.5 text-center rounded-xl border border-[#2a2a2a] text-gray-400 text-sm font-bold hover:text-white hover:border-[#444] transition-colors">
                Terug naar inloggen
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-gray-400 text-sm">Voer je e-mailadres in om een wachtwoord-reset link te ontvangen.</p>
              {error && <div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-1">E-mailadres</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                  className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#2176d4] transition-colors"/>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#2176d4] text-white font-bold hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] disabled:opacity-50 transition-all duration-200">
                {loading ? 'Versturen...' : 'Reset-link versturen'}
              </button>
              <Link href="/portaal" className="block text-center text-sm text-gray-600 hover:text-gray-400 transition-colors">
                ← Terug naar inloggen
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
