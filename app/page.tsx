import { supabaseAdmin } from '@/lib/supabase'
import { genereerSlots, nlVandaag } from '@/lib/slots'
import type { WeekSchedule, Service } from '@/lib/types'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const NL_DAYS = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']

async function getEersteSlot(
  barberId: string,
  schema: WeekSchedule,
  diensten: Service[],
  boekingen: { datum: string; tijd: string; duur: number }[],
): Promise<{ dag: string; tijd: string } | null> {
  const kortsteService = diensten.length ? diensten.reduce((a, b) => a.duur <= b.duur ? a : b) : null
  if (!kortsteService) return null

  const vandaag = nlVandaag()
  for (let i = 0; i < 7; i++) {
    const datum = addDays(vandaag, i)
    const dagBoekingen = boekingen.filter(b => b.datum === datum)
    const slots = genereerSlots(datum, schema, kortsteService, dagBoekingen)
    if (slots.length > 0) {
      const dagNaam = i === 0 ? 'Vandaag' : i === 1 ? 'Morgen' : NL_DAYS[new Date(datum + 'T12:00:00').getDay()]
      return { dag: dagNaam, tijd: slots[0] }
    }
  }
  return null
}

export default async function Home() {
  const vandaag = nlVandaag()
  const weekLater = addDays(vandaag, 7)

  const [{ data: kappers }, { data: reviewRows }, { data: settingsRows }, { data: boekingRows }] = await Promise.all([
    supabaseAdmin.from('barbers').select('id, naam, slug, bio, foto_url').eq('actief', true).order('naam'),
    supabaseAdmin.from('reviews').select('barber_id, rating'),
    supabaseAdmin.from('settings').select('barber_id, key, value').in('key', ['schema', 'diensten']),
    supabaseAdmin.from('bookings').select('barber_id, datum, tijd, duur').eq('geannuleerd', false).gte('datum', vandaag).lte('datum', weekLater),
  ])

  const ratingMap: Record<string, { som: number; aantal: number }> = {}
  for (const r of reviewRows ?? []) {
    if (!ratingMap[r.barber_id]) ratingMap[r.barber_id] = { som: 0, aantal: 0 }
    ratingMap[r.barber_id].som += r.rating
    ratingMap[r.barber_id].aantal += 1
  }

  const schemaMap: Record<string, WeekSchedule> = {}
  const dienstenMap: Record<string, Service[]> = {}
  for (const s of settingsRows ?? []) {
    try {
      if (s.key === 'schema') schemaMap[s.barber_id] = JSON.parse(s.value)
      if (s.key === 'diensten') dienstenMap[s.barber_id] = JSON.parse(s.value)
    } catch { /* ignore */ }
  }

  const kappersData = await Promise.all((kappers ?? []).map(async k => {
    const schema = schemaMap[k.id] ?? {}
    const diensten = dienstenMap[k.id] ?? []
    const boekingen = (boekingRows ?? []).filter(b => b.barber_id === k.id)
    const eersteSlot = await getEersteSlot(k.id, schema, diensten, boekingen)

    return {
      ...k,
      rating: ratingMap[k.id] ? ratingMap[k.id].som / ratingMap[k.id].aantal : null,
      aantalReviews: ratingMap[k.id]?.aantal ?? 0,
      eersteSlot,
    }
  }))

  return <HomeClient kappers={kappersData} />
}
