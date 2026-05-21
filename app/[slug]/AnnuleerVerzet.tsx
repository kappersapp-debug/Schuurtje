'use client'

import { useState, useEffect } from 'react'
import type { Service } from '@/lib/types'

/* ─── Types ──────────────────────────────────────────────── */
type Status = 'laden'|'actief'|'geannuleerd'|'niet_gevonden'
type Beschikbaarheid = Record<string, 'beschikbaar'|'bijna_vol'|'vol'|'gesloten'>

/* ─── Helpers ────────────────────────────────────────────── */
const NL_DAYS_SHORT = ['Ma','Di','Wo','Do','Vr','Za','Zo']
const NL_MONTHS_LONG = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
const NL_DAYS_LONG  = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']

function formatDatumNL(ds: string) {
  const d = new Date(ds+'T12:00:00')
  return `${NL_DAYS_LONG[d.getDay()]} ${d.getDate()} ${NL_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/* ─── Calendar ───────────────────────────────────────────── */
function Calendar({ value, onChange, beschikbaarheid, onMonthChange }: {
  value: string
  onChange: (d: string) => void
  beschikbaarheid: Beschikbaarheid
  onMonthChange?: (jaar: number, maand: number) => void
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const lastDay  = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 0)
  const startOffset = (firstDay.getDay()+6)%7
  const cells: (Date|null)[] = Array(startOffset).fill(null)
  for (let i=1; i<=lastDay.getDate(); i++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i))

  function prev() { const m=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1); setViewMonth(m); onMonthChange?.(m.getFullYear(),m.getMonth()+1) }
  function next() { const m=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1); setViewMonth(m); onMonthChange?.(m.getFullYear(),m.getMonth()+1) }
  const canPrev = viewMonth > new Date(today.getFullYear(), today.getMonth(), 1)

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} disabled={!canPrev}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#2176d4] font-bold text-lg">‹</button>
        <span className="font-bold text-white capitalize">
          {viewMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={next}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-colors text-[#2176d4] font-bold text-lg">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {NL_DAYS_SHORT.map(d=><div key={d} className="text-center text-xs font-bold text-gray-600 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day,i) => {
          if (!day) return <div key={i}/>
          const ds = toDateStr(day)
          const isPast = day < today
          const status = beschikbaarheid[ds]
          const gesloten = isPast || status==='gesloten' || (!status && day>today)
          const selected = ds===value
          const isToday = day.getTime()===today.getTime()
          return (
            <button key={i} disabled={gesloten} onClick={()=>onChange(ds)}
              className={['aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all gap-0.5',
                selected?'bg-[#2176d4] text-white shadow-[0_0_12px_rgba(33,118,212,0.35)]':'',
                isToday&&!selected?'ring-1 ring-[#2176d4] text-[#2176d4] bg-[#2176d4]/10':'',
                gesloten?'text-gray-700 cursor-not-allowed':!selected?'hover:bg-[#2176d4]/15 text-gray-400 hover:text-white':'',
              ].join(' ')}>
              <span className="leading-none">{day.getDate()}</span>
              {!gesloten&&status&&(
                <span className={`w-1.5 h-1.5 rounded-full ${selected?'bg-white/60':status==='vol'?'bg-red-400':status==='bijna_vol'?'bg-amber-400':'bg-green-400'}`}/>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────── */
export default function AnnuleerVerzet({ slug, annuleerCode, verzetCode, diensten, barberNaam }: {
  slug: string
  annuleerCode?: string
  verzetCode?: string
  diensten: Service[]
  barberNaam?: string
}) {
  const code = (annuleerCode ?? verzetCode ?? '').toUpperCase()
  const isAnnuleer = !!annuleerCode

  const [status, setStatus]   = useState<Status>('laden')
  const [booking, setBooking] = useState<{service:string;prijs:number;duur:number;datum:string;tijd:string;naam:string}|null>(null)
  const [email, setEmail]     = useState('')
  const [fout, setFout]       = useState('')
  const [laden, setLaden]     = useState(false)
  const [klaar, setKlaar]     = useState(false)

  const [datum, setDatum]             = useState('')
  const [tijd, setTijd]               = useState('')
  const [slots, setSlots]             = useState<string[]>([])
  const [slotsLaden, setSlotsLaden]   = useState(false)
  const [beschikbaarheid, setBeschikbaarheid] = useState<Beschikbaarheid>({})

  useEffect(() => {
    fetch(`/api/annuleer?code=${encodeURIComponent(code)}`)
      .then(r=>r.json())
      .then(d => {
        if (d.status==='active') {
          setStatus('actief')
          setBooking({ service: d.service??'', prijs: d.prijs??0, duur: d.duur??30, datum: d.datum??'', tijd: d.tijd??'', naam: d.naam??'' })
          if (!isAnnuleer) {
            const dienstObj = diensten.find(x=>x.naam===d.service)
            if (dienstObj) {
              const now = new Date()
              fetchBeschikbaarheid(now.getFullYear(), now.getMonth()+1, dienstObj.id)
            }
          }
        } else if (d.status==='geannuleerd') {
          setStatus('geannuleerd')
        } else {
          setStatus('niet_gevonden')
        }
      })
      .catch(() => setStatus('niet_gevonden'))
  }, [])

  async function fetchBeschikbaarheid(jaar: number, maand: number, dienstId: string) {
    try {
      const r = await fetch(`/api/beschikbaarheid/${slug}?jaar=${jaar}&maand=${maand}&dienst=${dienstId}`)
      if (!r.ok) return
      const d = await r.json()
      setBeschikbaarheid(prev=>({...prev,...(d.beschikbaarheid??{})}))
    } catch { /* non-fatal */ }
  }

  async function fetchSlots(d: string) {
    if (!booking) return
    const dienstObj = diensten.find(x=>x.naam===booking.service)
    if (!dienstObj) return
    setSlotsLaden(true); setSlots([])
    try {
      const r = await fetch(`/api/slots/${slug}?datum=${d}&dienst=${dienstObj.id}`)
      setSlots((await r.json()).slots??[])
    } catch { setSlots([]) }
    finally { setSlotsLaden(false) }
  }

  async function bevestig() {
    setFout(''); setLaden(true)
    try {
      if (isAnnuleer) {
        if (!email.trim()) { setFout('Vul uw e-mailadres in'); setLaden(false); return }
        const r = await fetch('/api/annuleer', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ code, email: email.trim() }),
        })
        const d = await r.json()
        if (!r.ok) { setFout(d.error??'Annuleren mislukt'); return }
      } else {
        if (!datum || !tijd) { setFout('Kies een datum en tijd'); setLaden(false); return }
        const r = await fetch('/api/verzet', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ code, datum, tijd }),
        })
        const d = await r.json()
        if (!r.ok) { setFout(d.error??'Verzetten mislukt'); return }
      }
      setKlaar(true)
    } finally { setLaden(false) }
  }

  /* ── Loading ── */
  if (status==='laden') return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  /* ── Not found / already cancelled ── */
  if (status==='geannuleerd'||status==='niet_gevonden') return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4 font-[family-name:var(--font-barlow)]">
      <div className="w-full max-w-sm bg-[#141414] rounded-2xl border border-[#2a2a2a] p-8 text-center">
        <div className="w-14 h-14 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl">✗</div>
        <h2 className="text-xl font-bold text-white mb-2">
          {status==='geannuleerd'?'Al geannuleerd':'Afspraak niet gevonden'}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {status==='geannuleerd'?'Deze afspraak is al eerder geannuleerd.':'We konden deze afspraak niet vinden.'}
        </p>
        <a href={`/${slug}`}
          className="block w-full py-2.5 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] transition-colors text-center">
          Nieuwe afspraak maken
        </a>
      </div>
    </div>
  )

  /* ── Done ── */
  if (klaar) return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4 font-[family-name:var(--font-barlow)]">
      <div className="w-full max-w-sm bg-[#141414] rounded-2xl border border-[#2a2a2a] p-8 text-center">
        <div className="w-14 h-14 bg-[#2176d4]/15 rounded-full flex items-center justify-center mx-auto mb-4 text-[#2176d4] text-2xl font-black">✓</div>
        <h2 className="text-xl font-bold text-white mb-2">
          {isAnnuleer?'Afspraak geannuleerd':'Afspraak verzet'}
        </h2>
        <p className="text-gray-500 text-sm mb-2">U ontvangt een bevestigingsmail.</p>
        {!isAnnuleer&&datum&&tijd&&(
          <p className="text-[#2176d4] font-bold text-sm mb-6">{formatDatumNL(datum)} · {tijd}</p>
        )}
        {isAnnuleer&&<div className="mb-6"/>}
        <a href={`/${slug}`}
          className="block w-full py-2.5 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] transition-colors text-center">
          Nieuwe afspraak maken
        </a>
      </div>
    </div>
  )

  /* ── Active ── */
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex flex-col items-center justify-start px-4 py-12 font-[family-name:var(--font-barlow)]">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <a href={`/${slug}`} className="text-gray-600 hover:text-gray-400 transition-colors text-sm font-medium">←</a>
          <div>
            <h1 className="text-white font-black text-lg">{barberNaam ?? slug}</h1>
            <p className="text-xs text-gray-600">{isAnnuleer?'Afspraak annuleren':'Afspraak verzetten'}</p>
          </div>
        </div>

        {/* Booking details */}
        {booking&&(
          <div className="bg-[#141414] rounded-2xl border border-[#2a2a2a] mb-6 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e1e1e]">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Boekingscode</p>
              <p className="text-xl font-black text-[#2176d4] tracking-widest">{code}</p>
            </div>
            <div className="divide-y divide-[#1e1e1e]">
              {[['Naam',booking.naam],['Dienst',booking.service],['Datum',formatDatumNL(booking.datum)],['Tijd',booking.tijd],['Prijs',`€${booking.prijs}`]].map(([k,v])=>(
                <div key={k} className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-gray-500 font-medium">{k}</span>
                  <span className="font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#141414] rounded-2xl border border-[#2a2a2a] p-5">
          {isAnnuleer ? (
            /* ── Annuleer ── */
            <div className="space-y-4">
              <div className="bg-red-900/15 border border-red-700/30 rounded-xl px-4 py-3 text-sm text-red-400 font-medium">
                U staat op het punt uw afspraak te annuleren. Dit kan niet ongedaan worden gemaakt.
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">E-mailadres ter bevestiging</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="uw@email.com"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/>
              </div>
              {fout&&<p className="text-red-400 text-sm font-semibold">{fout}</p>}
              <button onClick={bevestig} disabled={laden||!email.trim()}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50 transition-colors">
                {laden?'Bezig...':'Afspraak annuleren'}
              </button>
              <a href={`/${slug}`} className="block w-full py-2.5 text-center text-gray-500 text-sm hover:text-gray-300 transition-colors">
                Toch niet
              </a>
            </div>
          ) : (
            /* ── Verzet ── */
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-white mb-4">Kies een nieuwe datum</h3>
                <Calendar value={datum} beschikbaarheid={beschikbaarheid}
                  onMonthChange={(j,m)=>{ const d=diensten.find(x=>x.naam===booking?.service); if(d)fetchBeschikbaarheid(j,m,d.id) }}
                  onChange={d=>{ setDatum(d); setTijd(''); fetchSlots(d) }}/>
              </div>
              {datum&&(
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Kies een tijdslot</p>
                  {slotsLaden?(
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-3 border-[#2176d4] border-t-transparent rounded-full animate-spin"/>
                    </div>
                  ):slots.length===0?(
                    <p className="text-gray-500 text-sm text-center py-2">Geen tijden beschikbaar op deze dag</p>
                  ):(
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map(s=>(
                        <button key={s} onClick={()=>setTijd(s)}
                          className={['py-2.5 rounded-xl text-sm font-bold transition-all',
                            tijd===s?'bg-[#2176d4] text-white shadow-[0_0_15px_rgba(33,118,212,0.3)]'
                              :'bg-[#1a1a1a] border border-[#2a2a2a] text-[#2176d4] hover:bg-[#2176d4] hover:text-white hover:border-[#2176d4]',
                          ].join(' ')}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {fout&&<p className="text-red-400 text-sm font-semibold">{fout}</p>}
              <button onClick={bevestig} disabled={laden||!datum||!tijd}
                className="w-full py-3 rounded-xl bg-[#2176d4] text-white font-bold hover:bg-[#3080e0] disabled:opacity-40 transition-all">
                {laden?'Bezig...':'Afspraak verzetten'}
              </button>
              <a href={`/${slug}`} className="block w-full py-2.5 text-center text-gray-500 text-sm hover:text-gray-300 transition-colors">
                Annuleren
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
