export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'
import { cancelMailHtml, sendMail } from '@/lib/mailer'
import { cookies } from 'next/headers'
import { createKapperToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const NL_DAYS = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']
const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
function formatDateNL(ds: string) {
  const d = new Date(ds + 'T12:00:00')
  return `${NL_DAYS[d.getDay()]} ${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .eq('barber_id', session.id)

  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })
  const instellingen: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.key !== 'portal_password' && row.key !== 'portal_password_hash') {
      instellingen[row.key] = row.value
    }
  }
  return Response.json({ instellingen })
}

export async function POST(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { key, value } = body ?? {}
  if (!key || value === undefined) return Response.json({ error: 'key en value verplicht' }, { status: 400 })

  // Auto-cancel bookings on newly blocked dates
  if (key === 'geblokkeerde_datums') {
    const newDates: string[] = JSON.parse(value ?? '[]')
    const { data: existing } = await supabaseAdmin
      .from('settings').select('value').eq('barber_id', session.id).eq('key', 'geblokkeerde_datums').single()
    const oldDates: string[] = existing ? JSON.parse(existing.value ?? '[]') : []
    const added = newDates.filter(d => !oldDates.includes(d))

    if (added.length > 0) {
      const { data: affected } = await supabaseAdmin
        .from('bookings')
        .select('id, barber_id, email, naam, code, service, datum, tijd, duur, prijs, telefoon')
        .eq('barber_id', session.id)
        .eq('geannuleerd', false)
        .in('datum', added)

      if (affected && affected.length > 0) {
        await supabaseAdmin.from('bookings').update({ geannuleerd: true }).eq('barber_id', session.id).in('datum', added)

        const { data: barber } = await supabaseAdmin.from('barbers').select('naam').eq('id', session.id).single()

        for (const b of affected) {
          await supabaseAdmin.from('cancelled_bookings').insert({
            barber_id: session.id, code: b.code, naam: b.naam, email: b.email,
            telefoon: b.telefoon ?? '', service: b.service, prijs: b.prijs ?? 0,
            datum: b.datum, tijd: b.tijd, duur: b.duur, reden: 'Dag geblokkeerd door kapper',
          }).then(undefined, () => {})

          sendMail({
            to: b.email,
            subject: `Afspraak geannuleerd – ${b.code}`,
            html: cancelMailHtml({ naam: b.naam, code: b.code, service: b.service, datum: b.datum, tijd: b.tijd, kapperNaam: barber?.naam }),
          }).catch(() => {})
        }
      }
    }
  }

  // When service durations change, update future bookings
  if (key === 'diensten') {
    const newDiensten: { id: string; naam: string; duur: number }[] = JSON.parse(value ?? '[]')
    const { data: existing } = await supabaseAdmin.from('settings').select('value').eq('barber_id', session.id).eq('key', 'diensten').single()
    if (existing?.value) {
      const oldDiensten: { id: string; naam: string; duur: number }[] = JSON.parse(existing.value)
      const today = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).split(' ')[0]
      for (const nd of newDiensten) {
        const od = oldDiensten.find(s => s.id === nd.id)
        if (od && od.duur !== nd.duur) {
          await supabaseAdmin.from('bookings').update({ duur: nd.duur })
            .eq('barber_id', session.id).eq('service', nd.naam).gte('datum', today).eq('geannuleerd', false)
        }
      }
    }
  }

  // Password change
  if (key === 'wachtwoord') {
    const hash = await bcrypt.hash(value, 12)
    await supabaseAdmin.from('barbers').update({ password_hash: hash }).eq('id', session.id)

    // Re-issue session cookie
    const { data: barber } = await supabaseAdmin.from('barbers').select('naam, slug, email').eq('id', session.id).single()
    const token = createKapperToken({ id: session.id, naam: barber?.naam ?? session.naam, slug: barber?.slug ?? session.slug, email: barber?.email ?? session.email })
    const cookieStore = await cookies()
    cookieStore.set('schuurtje_session', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
    })
    return Response.json({ ok: true })
  }

  const strValue = typeof value === 'string' ? value : JSON.stringify(value)
  await supabaseAdmin.from('settings').upsert(
    { barber_id: session.id, key, value: strValue },
    { onConflict: 'barber_id,key' }
  )

  return Response.json({ ok: true })
}
