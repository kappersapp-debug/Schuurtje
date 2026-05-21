'use client'

import { useEffect, useState } from 'react'
import type { WeekSchedule, Service } from '@/lib/types'

const DAGEN = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']

export default function InstellingenPage() {
  const [schema, setSchema] = useState<WeekSchedule>({})
  const [diensten, setDiensten] = useState<Service[]>([])
  const [meldingen, setMeldingen] = useState(true)
  const [herinneringen, setHerinneringen] = useState(true)
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [melding, setMelding] = useState('')

  useEffect(() => {
    fetch('/api/instellingen')
      .then((r) => r.json())
      .then(({ instellingen }) => {
        if (instellingen.schema) setSchema(JSON.parse(instellingen.schema))
        if (instellingen.diensten) setDiensten(JSON.parse(instellingen.diensten))
        if (instellingen.meldingen) setMeldingen(instellingen.meldingen === 'true')
        if (instellingen.herinneringen) setHerinneringen(instellingen.herinneringen === 'true')
      })
      .finally(() => setLaden(false))
  }, [])

  async function sla(key: string, value: unknown) {
    setOpslaan(true)
    await fetch('/api/instellingen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    setMelding('Opgeslagen!')
    setTimeout(() => setMelding(''), 2000)
    setOpslaan(false)
  }

  function updateDag(dag: string, veld: string, waarde: unknown) {
    setSchema((prev) => ({ ...prev, [dag]: { ...prev[dag], [veld]: waarde } }))
  }

  function voegDienstToe() {
    const nieuw: Service = { id: String(Date.now()), naam: 'Nieuwe dienst', prijs: 20, duur: 30 }
    setDiensten((prev) => [...prev, nieuw])
  }

  function updateDienst(id: string, veld: keyof Service, waarde: unknown) {
    setDiensten((prev) => prev.map((d) => d.id === id ? { ...d, [veld]: waarde } : d))
  }

  function verwijderDienst(id: string) {
    setDiensten((prev) => prev.filter((d) => d.id !== id))
  }

  if (laden) return <p className="text-zinc-400 text-sm">Laden...</p>

  return (
    <div className="space-y-10 max-w-2xl">
      <h1 className="text-2xl font-bold">Instellingen</h1>
      {melding && <p className="text-green-600 text-sm font-medium">{melding}</p>}

      {/* Openingstijden */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Openingstijden</h2>
          <button onClick={() => sla('schema', schema)} disabled={opslaan} className="text-sm px-4 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50">Opslaan</button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 0].map((dag) => {
            const d = schema[String(dag)] ?? { open: false, start: '09:00', end: '18:00', breaks: [] }
            return (
              <div key={dag} className="rounded-xl border border-zinc-200 p-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={d.open} onChange={(e) => updateDag(String(dag), 'open', e.target.checked)} className="w-4 h-4" />
                  <span className="w-24 text-sm font-medium">{DAGEN[dag]}</span>
                  {d.open && (
                    <>
                      <input type="time" value={d.start} onChange={(e) => updateDag(String(dag), 'start', e.target.value)} className="border border-zinc-200 rounded-lg px-2 py-1 text-sm" />
                      <span className="text-zinc-400 text-sm">–</span>
                      <input type="time" value={d.end === '00:00' ? '00:00' : d.end} onChange={(e) => updateDag(String(dag), 'end', e.target.value)} className="border border-zinc-200 rounded-lg px-2 py-1 text-sm" />
                    </>
                  )}
                </div>
                {d.open && (
                  <div className="mt-2 ml-7 space-y-1">
                    {(d.breaks ?? []).map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">Pauze</span>
                        <input type="time" value={b.start} onChange={(e) => {
                          const newBreaks = [...d.breaks]
                          newBreaks[i] = { ...b, start: e.target.value }
                          updateDag(String(dag), 'breaks', newBreaks)
                        }} className="border border-zinc-200 rounded-lg px-2 py-0.5 text-sm" />
                        <span className="text-zinc-400 text-xs">–</span>
                        <input type="time" value={b.end} onChange={(e) => {
                          const newBreaks = [...d.breaks]
                          newBreaks[i] = { ...b, end: e.target.value }
                          updateDag(String(dag), 'breaks', newBreaks)
                        }} className="border border-zinc-200 rounded-lg px-2 py-0.5 text-sm" />
                        <button onClick={() => updateDag(String(dag), 'breaks', d.breaks.filter((_, j) => j !== i))} className="text-red-400 text-xs hover:text-red-600">×</button>
                      </div>
                    ))}
                    <button onClick={() => updateDag(String(dag), 'breaks', [...(d.breaks ?? []), { start: '12:00', end: '13:00' }])} className="text-xs text-zinc-400 hover:text-zinc-600">+ Pauze toevoegen</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Diensten */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Diensten</h2>
          <div className="flex gap-2">
            <button onClick={voegDienstToe} className="text-sm px-4 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50">+ Toevoegen</button>
            <button onClick={() => sla('diensten', diensten)} disabled={opslaan} className="text-sm px-4 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50">Opslaan</button>
          </div>
        </div>
        <div className="space-y-2">
          {diensten.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-xl border border-zinc-200 p-3">
              <input value={d.naam} onChange={(e) => updateDienst(d.id, 'naam', e.target.value)} className="flex-1 border-b border-zinc-200 focus:outline-none text-sm py-0.5" />
              <span className="text-zinc-400 text-sm">€</span>
              <input type="number" value={d.prijs} onChange={(e) => updateDienst(d.id, 'prijs', Number(e.target.value))} className="w-16 border border-zinc-200 rounded-lg px-2 py-0.5 text-sm" />
              <select value={d.duur} onChange={(e) => updateDienst(d.id, 'duur', Number(e.target.value) as 15 | 30)} className="border border-zinc-200 rounded-lg px-2 py-0.5 text-sm">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
              </select>
              <button onClick={() => verwijderDienst(d.id)} className="text-red-400 hover:text-red-600 text-sm">×</button>
            </div>
          ))}
        </div>
      </section>

      {/* Meldingen */}
      <section>
        <h2 className="font-semibold mb-4">Meldingen</h2>
        <div className="space-y-3">
          {[
            { label: 'Bevestigingsmails versturen', state: meldingen, key: 'meldingen', set: setMeldingen },
            { label: 'Herinneringsmails versturen (dag voor afspraak)', state: herinneringen, key: 'herinneringen', set: setHerinneringen },
          ].map(({ label, state, key, set }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={state}
                onChange={(e) => { set(e.target.checked); sla(key, String(e.target.checked)) }}
                className="w-4 h-4"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
