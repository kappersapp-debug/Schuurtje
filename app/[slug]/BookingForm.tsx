'use client'

import { useState, useEffect, useRef } from 'react'
import type { Service } from '@/lib/types'

type Stap = 'dienst' | 'datum' | 'tijd' | 'gegevens' | 'verificatie' | 'klaar'
type Beschikbaarheid = Record<string, 'beschikbaar' | 'bijna_vol' | 'vol' | 'gesloten'>

const MAANDEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
const DAGLETTERS = ['Ma','Di','Wo','Do','Vr','Za','Zo']

function nlVandaag() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })
}

export default function BookingForm({ slug, diensten }: { slug: string; diensten: Service[] }) {
  const vandaag = nlVandaag()
  const nu = new Date()

  const [stap, setStap] = useState<Stap>('dienst')
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

  // Kalender
  const [kalJaar, setKalJaar] = useState(nu.getFullYear())
  const [kalMaand, setKalMaand] = useState(nu.getMonth() + 1)
  const [beschikbaarheid, setBeschikbaarheid] = useState<Beschikbaarheid>({})
  const [beschLaden, setBeschLaden] = useState(false)

  // Verificatie
  const [verCode, setVerCode] = useState(['', '', '', '', '', ''])
  const [verFout, setVerFout] = useState('')
  const [verLaden, setVerLaden] = useState(false)
  const [verVerzonden, setVerVerzonden] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const verRefs = useRef<(HTMLInputElement | null)[]>([])

  // Terugkerende klant
  useEffect(() => {
    try {
      const opgeslagen = JSON.parse(localStorage.getItem('sch_klant') ?? 'null')
      if (opgeslagen?.naam) setNaam(opgeslagen.naam)
      if (opgeslagen?.email) setEmail(opgeslagen.email)
      if (opgeslagen?.telefoon) setTelefoon(opgeslagen.telefoon)
    } catch {}
  }, [])

  useEffect(() => {
    if (!dienst || !kalJaar || !kalMaand) return
    setBeschLaden(true)
    fetch(`/api/beschikbaarheid/${slug}?jaar=${kalJaar}&maand=${kalMaand}&dienst=${dienst.id}`)
      .then((r) => r.json())
      .then((d) => setBeschikbaarheid(d.beschikbaarheid ?? {}))
      .finally(() => setBeschLaden(false))
  }, [dienst, kalJaar, kalMaand, slug])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function laadSlots(d: string) {
    setSlotsLaden(true)
    setSlots([])
    try {
      const res = await fetch(`/api/slots/${slug}?datum=${d}&dienst=${dienst!.id}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
    } finally {
      setSlotsLaden(false)
    }
  }

  async function stuurVerificatie() {
    setVerLaden(true)
    setVerFout('')
    try {
      const res = await fetch('/api/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, slug }),
      })
      const data = await res.json()
      if (data.banned) { setFout('Boeken niet mogelijk met dit e-mailadres'); return }
      if (!res.ok) { setVerFout(data.error ?? 'Fout bij versturen'); return }
      setVerVerzonden(true)
      setCooldown(60)
      setStap('verificatie')
    } finally {
      setVerLaden(false)
    }
  }

  async function controleerCode() {
    const codeStr = verCode.join('')
    if (codeStr.length !== 6) return
    setVerLaden(true)
    setVerFout('')
    try {
      const res = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeStr, slug }),
      })
      const data = await res.json()
      if (!data.valid) { setVerFout(data.error ?? 'Onjuiste code'); return }
      await boek()
    } finally {
      setVerLaden(false)
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
      if (!res.ok) { setFout(data.error ?? 'Fout'); setStap('gegevens'); return }
      try { localStorage.setItem('sch_klant', JSON.stringify({ naam, email, telefoon })) } catch {}
      setCode(data.code)
      setStap('klaar')
    } finally {
      setLaden(false)
    }
  }

  function handleVerInput(i: number, val: string) {
    if (!/^\d*$/.test(val)) return
    const nieuw = [...verCode]
    nieuw[i] = val.slice(-1)
    setVerCode(nieuw)
    if (val && i < 5) verRefs.current[i + 1]?.focus()
    if (nieuw.every((c) => c !== '') && nieuw.join('').length === 6) {
      setTimeout(() => controleerCode(), 50)
    }
  }

  function handleVerPaste(e: React.ClipboardEvent) {
    const tekst = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (tekst.length === 6) {
      setVerCode(tekst.split(''))
      verRefs.current[5]?.focus()
      setTimeout(() => controleerCode(), 50)
    }
  }

  // Kalender rendering
  function renderKalender() {
    const eerstedag = new Date(kalJaar, kalMaand - 1, 1).getDay()
    const offset = (eerstedag + 6) % 7
    const dagenInMaand = new Date(kalJaar, kalMaand, 0).getDate()
    const cellen = Array(offset).fill(null).concat(
      Array.from({ length: dagenInMaand }, (_, i) => i + 1)
    )

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { if (kalMaand === 1) { setKalMaand(12); setKalJaar(j => j-1) } else setKalMaand(m => m-1) }}
            className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400">←</button>
          <span className="font-medium text-sm">{MAANDEN[kalMaand-1]} {kalJaar}</span>
          <button onClick={() => { if (kalMaand === 12) { setKalMaand(1); setKalJaar(j => j+1) } else setKalMaand(m => m+1) }}
            className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAGLETTERS.map((d) => <div key={d} className="text-center text-xs text-zinc-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cellen.map((dag, i) => {
            if (!dag) return <div key={i} />
            const d = `${kalJaar}-${String(kalMaand).padStart(2,'0')}-${String(dag).padStart(2,'0')}`
            const status = beschikbaarheid[d]
            const verleden = d < vandaag
            const geselecteerd = d === datum
            const kleur = verleden || status === 'gesloten' ? 'text-zinc-300 cursor-default'
              : status === 'bijna_vol' ? 'text-amber-600 hover:bg-amber-50 cursor-pointer'
              : status === 'beschikbaar' ? 'text-zinc-900 hover:bg-zinc-100 cursor-pointer'
              : 'text-zinc-300 cursor-default'

            return (
              <button key={i} disabled={verleden || !status || status === 'gesloten'}
                onClick={() => { setDatum(d); laadSlots(d); setTijd(''); setStap('tijd') }}
                className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-colors
                  ${geselecteerd ? 'bg-zinc-900 text-white' : kleur}
                  ${beschLaden ? 'opacity-50' : ''}`}
              >
                {dag}
              </button>
            )
          })}
        </div>
        <div className="flex gap-3 mt-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-900 inline-block"/>Beschikbaar</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Bijna vol</span>
        </div>
      </div>
    )
  }

  if (diensten.length === 0) return <p className="text-zinc-400">Nog geen diensten beschikbaar.</p>

  if (stap === 'klaar') {
    const agendaUrl = `/api/agenda/${slug}/${code}.ics`
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-2xl mb-1">Afspraak bevestigd!</p>
          <p className="text-3xl font-bold tracking-widest text-green-700 my-3">{code}</p>
          <p className="text-sm text-zinc-500">Bewaar deze code. Je ontvangt ook een bevestigingsmail.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4 text-sm space-y-1">
          <p><strong>{dienst?.naam}</strong></p>
          <p>{datum} om {tijd} · {dienst?.duur} min · €{dienst?.prijs}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a href={agendaUrl} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 text-sm hover:bg-zinc-50">
            📅 Agenda toevoegen
          </a>
          <a href={`/${slug}?verzet=${code}`} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 text-sm hover:bg-zinc-50">
            🔄 Verzetten
          </a>
          <a href={`/${slug}?annuleer=${code}`} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 text-sm hover:bg-zinc-50 col-span-2">
            ❌ Annuleren
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Voortgangsbalk */}
      <div className="flex gap-1">
        {(['dienst','datum','tijd','gegevens','verificatie'] as Stap[]).map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
            ['dienst','datum','tijd','gegevens','verificatie'].indexOf(stap) >= i ? 'bg-zinc-900' : 'bg-zinc-200'
          }`}/>
        ))}
      </div>

      {/* Stap 1: Dienst */}
      <section>
        <h2 className="font-semibold mb-3">Dienst</h2>
        <div className="grid gap-2">
          {diensten.map((d) => (
            <button key={d.id}
              onClick={() => { setDienst(d); setDatum(''); setTijd(''); setStap('datum') }}
              className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-all text-left ${
                dienst?.id === d.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
            >
              <span>{d.naam}</span>
              <span className="text-sm opacity-70">€{d.prijs} · {d.duur} min</span>
            </button>
          ))}
        </div>
      </section>

      {/* Stap 2: Datum */}
      {stap !== 'dienst' && (
        <section>
          <h2 className="font-semibold mb-3">Datum {datum && <span className="font-normal text-zinc-500">— {datum}</span>}</h2>
          {renderKalender()}
        </section>
      )}

      {/* Stap 3: Tijd */}
      {(stap === 'tijd' || stap === 'gegevens' || stap === 'verificatie') && datum && (
        <section>
          <h2 className="font-semibold mb-3">Tijd {tijd && <span className="font-normal text-zinc-500">— {tijd}</span>}</h2>
          {slotsLaden && <p className="text-zinc-400 text-sm">Laden...</p>}
          {!slotsLaden && slots.length === 0 && <p className="text-zinc-400 text-sm">Geen tijden beschikbaar op deze dag.</p>}
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button key={s} onClick={() => { setTijd(s); setStap('gegevens') }}
                className={`py-2 rounded-xl border text-sm transition-all ${
                  tijd === s ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
              >{s}</button>
            ))}
          </div>
        </section>
      )}

      {/* Stap 4: Gegevens */}
      {(stap === 'gegevens' || stap === 'verificatie') && tijd && (
        <section>
          <h2 className="font-semibold mb-3">Jouw gegevens</h2>
          {naam && email && telefoon && stap === 'gegevens' && (
            <div className="mb-3 p-3 bg-zinc-50 rounded-xl text-sm text-zinc-600">
              Welkom terug, <strong>{naam}</strong>!
            </div>
          )}
          <div className="space-y-3">
            <input placeholder="Naam *" value={naam} onChange={(e) => setNaam(e.target.value)}
              className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900" />
            <input type="email" placeholder="E-mailadres *" value={email} onChange={(e) => setEmail(e.target.value)}
              className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900" />
            <input type="tel" placeholder="Telefoonnummer *" value={telefoon} onChange={(e) => setTelefoon(e.target.value)}
              className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900" />
            <textarea placeholder="Opmerkingen (optioneel)" value={notities} onChange={(e) => setNotities(e.target.value)}
              rows={2} className="border border-zinc-200 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-zinc-900 resize-none" />
          </div>
          {fout && <p className="text-red-500 text-sm mt-2">{fout}</p>}
          <div className="mt-4 p-3 bg-zinc-50 rounded-xl text-sm text-zinc-600">
            <p><strong>{dienst?.naam}</strong> op {datum} om {tijd}</p>
            <p>€{dienst?.prijs} · {dienst?.duur} min</p>
          </div>
          {stap === 'gegevens' && (
            <button onClick={stuurVerificatie} disabled={verLaden || !naam || !email || !telefoon}
              className="mt-4 w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
              {verLaden ? 'Bezig...' : 'Verificatiecode ontvangen →'}
            </button>
          )}
        </section>
      )}

      {/* Stap 5: Verificatie */}
      {stap === 'verificatie' && (
        <section>
          <h2 className="font-semibold mb-1">Verificatiecode</h2>
          <p className="text-sm text-zinc-500 mb-4">Voer de 6-cijferige code in die we naar <strong>{email}</strong> hebben gestuurd.</p>
          <div className="flex gap-2 justify-center" onPaste={handleVerPaste}>
            {verCode.map((c, i) => (
              <input key={i} ref={(el) => { verRefs.current[i] = el }}
                value={c} onChange={(e) => handleVerInput(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Backspace' && !c && i > 0) verRefs.current[i-1]?.focus() }}
                maxLength={1} inputMode="numeric"
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-900 transition-colors"
              />
            ))}
          </div>
          {verFout && <p className="text-red-500 text-sm mt-3 text-center">{verFout}</p>}
          {verLaden && <p className="text-zinc-400 text-sm mt-3 text-center">Controleren...</p>}
          <div className="mt-4 text-center">
            <button onClick={stuurVerificatie} disabled={cooldown > 0 || verLaden}
              className="text-sm text-zinc-500 hover:text-zinc-900 disabled:opacity-50">
              {cooldown > 0 ? `Opnieuw sturen (${cooldown}s)` : 'Code opnieuw sturen'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
