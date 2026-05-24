'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          className={`text-3xl transition-transform ${onChange ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}>
          <span className={(hover || value) >= n ? 'text-amber-400' : 'text-gray-700'}>★</span>
        </button>
      ))}
    </div>
  )
}

function BeoordelingForm() {
  const params = useSearchParams()
  const code = params.get('code')?.toUpperCase() ?? ''

  const [status, setStatus] = useState<'laden'|'form'|'al_beoordeeld'|'niet_gevonden'|'nog_niet'|'verstuurd'>('laden')
  const [boeking, setBoeking] = useState<{naam: string; service: string}|null>(null)
  const [rating, setRating] = useState(0)
  const [tekst, setTekst] = useState('')
  const [saving, setSaving] = useState(false)
  const [fout, setFout] = useState('')

  useEffect(() => {
    if (!code) { setStatus('niet_gevonden'); return }
    fetch(`/api/review?code=${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setBoeking({ naam: d.naam, service: d.service }); setStatus('form') }
        else if (d.error === 'Al beoordeeld') setStatus('al_beoordeeld')
        else if (d.error === 'Afspraak nog niet geweest') setStatus('nog_niet')
        else setStatus('niet_gevonden')
      })
      .catch(() => setStatus('niet_gevonden'))
  }, [code])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setFout('Kies een aantal sterren'); return }
    setSaving(true); setFout('')
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, rating, tekst }),
    })
    if (res.ok) setStatus('verstuurd')
    else { const d = await res.json(); setFout(d.error ?? 'Fout bij versturen') }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4 font-[family-name:var(--font-barlow)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-[#2176d4] text-2xl">✂</span>
          <p className="text-gray-600 text-sm mt-1">Schuurtje</p>
        </div>

        <div className="bg-[#141414] rounded-2xl border border-[#2a2a2a] p-8">
          {status === 'laden' && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin"/>
            </div>
          )}

          {status === 'nog_niet' && (
            <div className="text-center py-4">
              <p className="text-2xl mb-3">⏳</p>
              <h2 className="font-bold text-white mb-2">Afspraak nog niet geweest</h2>
              <p className="text-gray-500 text-sm">U kunt een beoordeling achterlaten nadat uw afspraak heeft plaatsgevonden.</p>
            </div>
          )}

          {status === 'niet_gevonden' && (
            <div className="text-center py-4">
              <p className="text-2xl mb-3">🔍</p>
              <h2 className="font-bold text-white mb-2">Boeking niet gevonden</h2>
              <p className="text-gray-500 text-sm">De link is ongeldig of verlopen.</p>
            </div>
          )}

          {status === 'al_beoordeeld' && (
            <div className="text-center py-4">
              <p className="text-2xl mb-3">✅</p>
              <h2 className="font-bold text-white mb-2">Al beoordeeld</h2>
              <p className="text-gray-500 text-sm">U heeft deze afspraak al beoordeeld. Bedankt!</p>
            </div>
          )}

          {status === 'verstuurd' && (
            <div className="text-center py-4">
              <p className="text-3xl mb-3">⭐</p>
              <h2 className="font-bold text-white text-xl mb-2">Bedankt!</h2>
              <p className="text-gray-500 text-sm">Uw beoordeling is opgeslagen.</p>
            </div>
          )}

          {status === 'form' && boeking && (
            <form onSubmit={submit} className="space-y-6">
              <div>
                <h2 className="font-bold text-white text-xl mb-1">Beoordeling achterlaten</h2>
                <p className="text-gray-500 text-sm">{boeking.service}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Uw beoordeling</p>
                <Stars value={rating} onChange={setRating}/>
                {rating > 0 && (
                  <p className="text-xs text-gray-600 mt-1.5">
                    {['','Slecht','Matig','Goed','Zeer goed','Uitstekend'][rating]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Opmerking <span className="normal-case font-normal text-gray-700">(optioneel)</span>
                </label>
                <textarea value={tekst} onChange={e => setTekst(e.target.value)} rows={3}
                  placeholder="Deel uw ervaring..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors resize-none"/>
              </div>

              {fout && <p className="text-sm text-red-400 font-semibold">{fout}</p>}

              <button type="submit" disabled={saving || rating === 0}
                className="w-full py-3 rounded-xl bg-[#2176d4] text-white font-bold hover:bg-[#3080e0] disabled:opacity-50 transition-all">
                {saving ? 'Versturen...' : 'Beoordeling versturen'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BeoordelingPage() {
  return (
    <Suspense>
      <BeoordelingForm/>
    </Suspense>
  )
}
