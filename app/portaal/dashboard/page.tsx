import { getKapperSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { nlVandaag } from '@/lib/slots'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const session = await getKapperSession()
  if (!session) redirect('/portaal')

  const vandaag = nlVandaag()

  const [{ data: vandaagAfspraken }, { data: aankomend }, { data: stats }] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, naam, tijd, service, duur')
      .eq('barber_id', session.id)
      .eq('datum', vandaag)
      .eq('geannuleerd', false)
      .order('tijd'),
    supabaseAdmin
      .from('bookings')
      .select('id, naam, datum, tijd, service')
      .eq('barber_id', session.id)
      .gt('datum', vandaag)
      .eq('geannuleerd', false)
      .order('datum')
      .order('tijd')
      .limit(5),
    supabaseAdmin
      .from('bookings')
      .select('id, prijs, no_show')
      .eq('barber_id', session.id)
      .eq('geannuleerd', false),
  ])

  const totalOmzet = (stats ?? []).filter((b) => !b.no_show).reduce((s, b) => s + Number(b.prijs), 0)
  const totaalAfspraken = (stats ?? []).length
  const noShows = (stats ?? []).filter((b) => b.no_show).length

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Totale omzet</p>
          <p className="text-2xl font-bold mt-1">€{totalOmzet.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Afspraken totaal</p>
          <p className="text-2xl font-bold mt-1">{totaalAfspraken}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">No-shows</p>
          <p className="text-2xl font-bold mt-1">{noShows}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Vandaag — {vandaag}</h2>
        {!vandaagAfspraken?.length ? (
          <p className="text-zinc-400 text-sm">Geen afspraken vandaag.</p>
        ) : (
          <div className="space-y-2">
            {vandaagAfspraken.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
                <div>
                  <p className="font-medium">{a.naam}</p>
                  <p className="text-sm text-zinc-500">{a.service} · {a.duur} min</p>
                </div>
                <span className="text-sm font-mono">{a.tijd}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">Aankomende afspraken</h2>
        {!aankomend?.length ? (
          <p className="text-zinc-400 text-sm">Geen aankomende afspraken.</p>
        ) : (
          <div className="space-y-2">
            {aankomend.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
                <div>
                  <p className="font-medium">{a.naam}</p>
                  <p className="text-sm text-zinc-500">{a.service}</p>
                </div>
                <span className="text-sm font-mono">{a.datum} {a.tijd}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
