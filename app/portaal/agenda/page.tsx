'use client'

import { useEffect, useState } from 'react'
import type { Booking } from '@/lib/types'

function weekDagen(datum: string): string[] {
  const d = new Date(datum)
  const dag = d.getDay()
  const maandag = new Date(d)
  maandag.setDate(d.getDate() - ((dag + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(maandag)
    x.setDate(maandag.getDate() + i)
    return x.toLocaleDateString('sv-SE')
  })
}

const DAGLETTERS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

export default function AgendaPage() {
  const vandaag = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })
  const [peildatum, setPeildatum] = useState(vandaag)
  const [afspraken, setAfspraken] = useState<Booking[]>([])
  const [laden, setLaden] = useState(true)

  const week = weekDagen(peildatum)

  useEffect(() => {
    setLaden(true)
    fetch(`/api/afspraken?van=${week[0]}&tot=${week[6]}`)
      .then((r) => r.json())
      .then((d) => setAfspraken(d.afspraken ?? []))
      .finally(() => setLaden(false))
  }, [peildatum])

  function vorigeWeek() {
    const d = new Date(week[0])
    d.setDate(d.getDate() - 7)
    setPeildatum(d.toLocaleDateString('sv-SE'))
  }
  function volgendeWeek() {
    const d = new Date(week[0])
    d.setDate(d.getDate() + 7)
    setPeildatum(d.toLocaleDateString('sv-SE'))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={vorigeWeek} className="px-3 py-1.5 rounded-lg border border-zinc-200 text-sm hover:bg-zinc-50">← Vorige</button>
          <button onClick={() => setPeildatum(vandaag)} className="px-3 py-1.5 rounded-lg border border-zinc-200 text-sm hover:bg-zinc-50">Vandaag</button>
          <button onClick={volgendeWeek} className="px-3 py-1.5 rounded-lg border border-zinc-200 text-sm hover:bg-zinc-50">Volgende →</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {week.map((dag, i) => {
          const dagAfspraken = afspraken.filter((a) => a.datum === dag)
          const isVandaag = dag === vandaag
          return (
            <div key={dag} className={`rounded-xl border p-2 min-h-32 ${isVandaag ? 'border-zinc-900' : 'border-zinc-200'}`}>
              <p className={`text-xs font-medium mb-1 ${isVandaag ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {DAGLETTERS[i]} {dag.slice(8)}
              </p>
              {laden && <div className="h-2 bg-zinc-100 rounded animate-pulse" />}
              <div className="space-y-1">
                {dagAfspraken.map((a) => (
                  <div key={a.id} className="bg-zinc-900 text-white rounded-lg px-2 py-1 text-xs">
                    <p className="font-mono">{a.tijd}</p>
                    <p className="truncate">{a.naam}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
