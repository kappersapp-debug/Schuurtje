'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [ww, setWw] = useState('')
  const [bevestig, setBevestig] = useState('')
  const [loading, setLoading] = useState(false)
  const [klaar, setKlaar] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!token) setError('Ongeldige reset-link')
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (ww !== bevestig) { setError('Wachtwoorden komen niet overeen'); return }
    if (ww.length < 6) { setError('Minimaal 6 tekens vereist'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, wachtwoord: ww }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Mislukt'); return }
      setKlaar(true)
    } catch {
      setError('Netwerkfout — probeer opnieuw')
    } finally {
      setLoading(false)
    }
  }

  if (klaar) return (
    <div className="text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
        <span className="text-green-400 text-xl">✓</span>
      </div>
      <p className="text-white font-bold">Wachtwoord ingesteld</p>
      <p className="text-gray-500 text-sm">Je kunt nu inloggen met je nieuwe wachtwoord.</p>
      <Link href="/portaal" className="block w-full py-2.5 text-center rounded-xl bg-[#2176d4] text-white font-bold hover:bg-[#3080e0] transition-colors text-sm">
        Naar inloggen →
      </Link>
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-gray-400 text-sm">Kies een nieuw wachtwoord voor je portaal.</p>
      {error && <div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}
      <div>
        <label className="block text-sm font-bold text-gray-400 mb-1">Nieuw wachtwoord</label>
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={ww} onChange={e => setWw(e.target.value)} required autoFocus
            className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-4 py-3 pr-12 font-medium focus:outline-none focus:border-[#2176d4] transition-colors"/>
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium hover:text-gray-300">{show ? 'Verberg' : 'Toon'}</button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-400 mb-1">Bevestig wachtwoord</label>
        <input type={show ? 'text' : 'password'} value={bevestig} onChange={e => setBevestig(e.target.value)} required
          className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#2176d4] transition-colors"/>
      </div>
      <button type="submit" disabled={loading || !token}
        className="w-full py-3 rounded-xl bg-[#2176d4] text-white font-bold hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] disabled:opacity-50 transition-all duration-200">
        {loading ? 'Opslaan...' : 'Wachtwoord instellen'}
      </button>
      <Link href="/portaal" className="block text-center text-sm text-gray-600 hover:text-gray-400 transition-colors">
        ← Terug naar inloggen
      </Link>
    </form>
  )
}

export default function WachtwoordResetPage() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#141414] rounded-xl shadow-xl border border-[#2a2a2a] overflow-hidden">
        <div className="bg-[#111] px-8 py-8 text-center border-b border-[#1e1e1e]">
          <div className="w-16 h-16 rounded-full bg-[#2176d4]/15 border border-[#2176d4]/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-[#2176d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
          </div>
          <h1 className="text-white font-bold text-lg">Nieuw wachtwoord</h1>
          <p className="text-gray-500 text-xs mt-0.5">Schuurtje Portaal</p>
        </div>
        <div className="p-8">
          <Suspense fallback={<div className="text-gray-500 text-sm text-center">Laden...</div>}>
            <ResetForm/>
          </Suspense>
        </div>
      </div>
    </div>
  )
}
