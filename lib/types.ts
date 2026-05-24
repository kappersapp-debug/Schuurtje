export type Barber = {
  id: string
  naam: string
  slug: string
  bio: string | null
  foto_url: string | null
  email: string
  created_at: string
}

export type Booking = {
  id: string
  barber_id: string
  code: string
  naam: string
  email: string
  telefoon: string
  service: string
  prijs: number
  datum: string
  tijd: string
  duur: number
  notities: string | null
  no_show: boolean
  geannuleerd: boolean
  created_at: string
}

export type Setting = {
  id: string
  barber_id: string
  key: string
  value: string
}

export type WaitlistEntry = {
  id: string
  barber_id: string
  naam: string
  email: string
  telefoon: string
  service: string
  datum: string
  created_at: string
}

export type CancelledBooking = {
  id: string
  barber_id: string
  code: string
  naam: string
  email: string
  telefoon: string
  service: string
  prijs: number
  datum: string
  tijd: string
  duur: number
  reden: string | null
  geannuleerd_op: string
}

export type BannedEmail = {
  id: string
  barber_id: string
  email: string
  reden: string | null
  created_at: string
}

export type DaySchedule = {
  open: boolean
  start: string
  end: string
  breaks: { start: string; end: string }[]
}

export type WeekSchedule = Record<string, DaySchedule>

export type Service = {
  id: string
  naam: string
  prijs: number
  duur: number
  beschrijving?: string
}

export type KapperSession = {
  id: string
  email: string
  slug: string
  naam: string
  exp: number
}

export type AdminSession = {
  role: 'admin'
  exp: number
}
