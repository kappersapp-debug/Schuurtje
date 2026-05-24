import type { WeekSchedule, Service, Booking } from './types'

export function nlVandaag(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).split(' ')[0]
}

function toMins(time: string): number {
  if (time === '00:00') return 1440
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function fromMins(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function genereerSlots(
  datum: string,
  weekSchema: WeekSchedule,
  dienst: Service,
  boekingen: Pick<Booking, 'tijd' | 'duur'>[],
  bufferTijd = 0,
): string[] {
  const dag = new Date(datum + 'T12:00:00').getDay()
  const schema = weekSchema[String(dag)]
  if (!schema?.open) return []

  const start = toMins(schema.start)
  const end = toMins(schema.end)
  const slots: string[] = []

  for (let m = start; m + dienst.duur <= end; m += 15) {
    const slotStart = m
    const slotEnd = m + dienst.duur

    // check pauzes
    const inPauze = schema.breaks.some((b) => {
      const bs = toMins(b.start)
      const be = toMins(b.end)
      return slotStart < be && bs < slotEnd
    })
    if (inPauze) continue

    // check overlap met bestaande boekingen (incl. optionele buffer erna)
    const overlapping = boekingen.some((b) => {
      const bStart = toMins(b.tijd)
      const bEnd = bStart + b.duur + bufferTijd
      return slotStart < bEnd && bStart < slotEnd
    })
    if (overlapping) continue

    slots.push(fromMins(m))
  }

  return slots
}

export function generateCode(prefix = 'SCH'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = prefix
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}
