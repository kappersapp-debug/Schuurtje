'use client'

import { useEffect, useState } from 'react'

type Review = {
  id: string
  naam: string
  rating: number
  tekst: string | null
  booking_code: string
  created_at: string
  barbers: { naam: string } | null
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-400 tracking-tight">
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  )
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [laden, setLaden] = useState(true)
  const [verwijderConfirm, setVerwijderConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function laad() {
    setLaden(true)
    const res = await fetch('/api/admin/reviews')
    const data = await res.json()
    setReviews(data.reviews ?? [])
    setLaden(false)
  }

  useEffect(() => { laad() }, [])

  async function verwijder(id: string) {
    setLoading(id)
    await fetch('/api/admin/reviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setVerwijderConfirm(null)
    setLoading(null)
    laad()
  }

  const gemiddelde = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Reviews</h1>
          <p className="text-gray-600 text-sm mt-0.5">
            {reviews.length} beoordelingen
            {gemiddelde && <span className="ml-2 text-amber-400 font-bold">★ {gemiddelde}</span>}
          </p>
        </div>
      </div>

      {laden ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-600">Nog geen beoordelingen.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-[#141414] rounded-2xl border border-[#222] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white">{r.naam}</span>
                    <Stars value={r.rating}/>
                    {r.barbers && (
                      <span className="text-xs text-gray-600 font-mono">bij {r.barbers.naam}</span>
                    )}
                    <span className="text-xs text-gray-700">
                      {new Date(r.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {r.tekst && <p className="text-sm text-gray-400">{r.tekst}</p>}
                  <p className="text-[10px] text-gray-700 font-mono mt-1">{r.booking_code}</p>
                </div>
                <div className="shrink-0">
                  {verwijderConfirm === r.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">Zeker?</span>
                      <button onClick={() => verwijder(r.id)} disabled={loading === r.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold bg-red-900/40 text-red-400 border border-red-800/40 hover:bg-red-900/60 disabled:opacity-50 transition-all">
                        {loading === r.id ? '...' : 'Ja'}
                      </button>
                      <button onClick={() => setVerwijderConfirm(null)}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold border border-[#2a2a2a] text-gray-500 hover:text-gray-300 transition-all">
                        Nee
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setVerwijderConfirm(r.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold border border-[#2a2a2a] text-gray-600 hover:border-red-800/50 hover:text-red-400 hover:bg-red-900/10 transition-all">
                      Verwijder
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
