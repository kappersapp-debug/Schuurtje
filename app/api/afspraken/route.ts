export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'
import { sendMail, cancelMailHtml } from '@/lib/mailer'
import { generateCode } from '@/lib/slots'
import type { WeekSchedule } from '@/lib/types'

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const NL_DAYS = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']
const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
function formatDateNL(ds: string) {
  const d = new Date(ds + 'T12:00:00')
  return `${NL_DAYS[d.getDay()]} ${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export async function GET(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'all'
  const search = searchParams.get('search') ?? ''
  const month  = searchParams.get('month')
  const since  = searchParams.get('since')
  const today  = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).split(' ')[0]

  // Polling: return new bookings + cancellations since timestamp
  if (since) {
    const [{ data: newBookings }, { data: cancellations }] = await Promise.all([
      supabaseAdmin.from('bookings').select('*').eq('barber_id', session.id).gt('created_at', since).order('created_at', { ascending: false }),
      supabaseAdmin.from('cancelled_bookings').select('*').eq('barber_id', session.id).gt('geannuleerd_op', since).order('geannuleerd_op', { ascending: false }),
    ])
    return Response.json({ afspraken: newBookings ?? [], annuleringen: cancellations ?? [] })
  }

  const offset = Number(searchParams.get('offset') ?? 0)

  let query = supabaseAdmin.from('bookings').select('*').eq('barber_id', session.id)

  if (filter === 'today') {
    query = query.eq('datum', today).eq('geannuleerd', false).order('tijd', { ascending: true })
  } else if (filter === 'upcoming') {
    query = query.gte('datum', today).eq('geannuleerd', false).order('datum', { ascending: true }).order('tijd', { ascending: true }).limit(50)
  } else if (filter === 'past') {
    query = query.lt('datum', today).order('datum', { ascending: false }).order('tijd', { ascending: false }).range(offset, offset + 20)
  } else {
    query = query.eq('geannuleerd', false).order('datum', { ascending: true }).order('tijd', { ascending: true })
  }

  if (month) {
    const [yr, mo] = month.split('-').map(Number)
    const lastDay = new Date(yr, mo, 0).getDate()
    query = query.gte('datum', `${month}-01`).lte('datum', `${month}-${String(lastDay).padStart(2, '0')}`)
  }

  if (search) {
    query = query.or(`naam.ilike.%${search}%,email.ilike.%${search}%,code.ilike.%${search}%,telefoon.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: 'DB fout' }, { status: 500 })
  const heeftMeer = filter === 'past' && (data?.length ?? 0) > 20
  const afspraken = heeftMeer ? (data ?? []).slice(0, 20) : (data ?? [])
  return Response.json({ afspraken, heeftMeer })
}

export async function DELETE(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'id vereist' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings').select('*').eq('id', id).eq('barber_id', session.id).single()
  if (!booking) return Response.json({ error: 'Niet gevonden' }, { status: 404 })

  await supabaseAdmin.from('bookings').update({ geannuleerd: true }).eq('id', id)

  const { data: barber } = await supabaseAdmin.from('barbers').select('naam, slug').eq('id', session.id).single()

  await supabaseAdmin.from('cancelled_bookings').insert({
    barber_id: session.id, code: booking.code, naam: booking.naam,
    email: booking.email, telefoon: booking.telefoon ?? '',
    service: booking.service, prijs: booking.prijs ?? 0,
    datum: booking.datum, tijd: booking.tijd, duur: booking.duur,
    reden: 'Geannuleerd door kapper',
  }).then(undefined, () => {})

  if (booking.email) {
    sendMail({
      to: booking.email,
      subject: `Afspraak geannuleerd – ${booking.code}`,
      html: cancelMailHtml({ naam: booking.naam, code: booking.code, service: booking.service, datum: booking.datum, tijd: booking.tijd, kapperNaam: barber?.naam }),
    }).catch(() => {})
  }

  return Response.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { naam, telefoon, email, service, prijs, duur, datum, tijd, notities } = body ?? {}
  if (!naam || !service || !datum || !tijd) {
    return Response.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }

  let code = generateCode()
  for (let i = 0; i < 10; i++) {
    const { data } = await supabaseAdmin.from('bookings').select('id').eq('code', code).single()
    if (!data) break
    code = generateCode()
  }

  const normEmail = email ? email.toLowerCase() : ''
  const { error } = await supabaseAdmin.from('bookings').insert({
    barber_id: session.id, code, naam, telefoon: telefoon ?? '',
    email: normEmail, service, prijs: prijs ?? 0, duur: duur ?? 30,
    datum, tijd, notities: notities ?? null,
  })
  if (error) return Response.json({ error: 'Opslaan mislukt' }, { status: 500 })

  if (normEmail) {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const { data: barber } = await supabaseAdmin.from('barbers').select('naam, slug').eq('id', session.id).single()
    const annuleerUrl  = `${base}/${barber?.slug ?? ''}?annuleer=${code}`
    const verzetUrl    = `${base}/${barber?.slug ?? ''}?verzet=${code}`
    sendMail({
      to: normEmail,
      subject: `Afspraak bevestigd – ${code}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#2176d4;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:24px;">✂ ${esc(barber?.naam ?? 'Schuurtje')}</h1>
          </div>
          <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
            <h2 style="color:#2176d4;margin-top:0;">Afspraak bevestigd!</h2>
            <p>Hallo <strong>${esc(naam)}</strong>, uw afspraak is bevestigd.</p>
            <div style="background:#dbeafe;border-radius:10px;padding:20px;margin:20px 0;">
              <p style="margin:6px 0;"><strong>Boekingscode:</strong> <span style="font-size:18px;font-weight:800;color:#2176d4;">${code}</span></p>
              <p style="margin:6px 0;"><strong>Dienst:</strong> ${esc(service)}</p>
              <p style="margin:6px 0;"><strong>Datum:</strong> ${formatDateNL(datum)}</p>
              <p style="margin:6px 0;"><strong>Tijd:</strong> ${tijd}</p>
              <p style="margin:6px 0;"><strong>Prijs:</strong> €${prijs ?? 0}</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${verzetUrl}" style="display:block;background:#2176d4;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:10px;">Afspraak verzetten</a>
              <a href="${annuleerUrl}" style="display:block;background:#dc2626;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;">Afspraak annuleren</a>
            </div>
          </div>
        </div>`,
    }).catch(() => {})
  }

  return Response.json({ ok: true, code })
}

export async function PATCH(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { id } = body ?? {}
  if (!id) return Response.json({ error: 'id vereist' }, { status: 400 })

  // Quick no_show toggle
  if ('no_show' in body && !body.naam) {
    const { error } = await supabaseAdmin.from('bookings').update({ no_show: body.no_show }).eq('id', id).eq('barber_id', session.id)
    if (error) return Response.json({ error: 'Bijwerken mislukt' }, { status: 500 })
    return Response.json({ ok: true })
  }

  const { naam, telefoon, email, service, prijs, duur, datum, tijd, notities } = body

  // Validate new slot if date/time changed
  if (datum && tijd) {
    const { data: settingsRows } = await supabaseAdmin.from('settings').select('key, value').eq('barber_id', session.id)
    const settings: Record<string, string> = {}
    for (const row of settingsRows ?? []) settings[row.key] = row.value
    const dow = new Date(datum + 'T12:00:00').getDay()
    const dur = duur ?? 30
    const [th, tm] = tijd.split(':').map(Number)
    const tStart = th * 60 + tm

    if (settings.geblokkeerde_datums) {
      const blocked: string[] = JSON.parse(settings.geblokkeerde_datums)
      if (blocked.includes(datum)) return Response.json({ error: 'Dit tijdslot is al bezet' }, { status: 409 })
    }
    if (settings.schema) {
      const sched: WeekSchedule = JSON.parse(settings.schema)
      const cfg = sched[String(dow)]
      if (!cfg?.open) return Response.json({ error: 'Dit tijdslot is al bezet' }, { status: 409 })
      const [wsh, wsm] = (cfg.start ?? '09:00').split(':').map(Number)
      const [weh, wem] = (cfg.end ?? '17:00').split(':').map(Number)
      const workEndMins = weh === 0 && wem === 0 ? 1440 : weh * 60 + wem
      if (tStart < wsh * 60 + wsm || tStart + dur > workEndMins) return Response.json({ error: 'Dit tijdslot is al bezet' }, { status: 409 })
      for (const brk of cfg.breaks ?? []) {
        const [bs, bsm] = brk.start.split(':').map(Number)
        const [be, bem] = brk.end.split(':').map(Number)
        if ((bs * 60 + bsm) < tStart + dur && tStart < (be * 60 + bem)) return Response.json({ error: 'Dit tijdslot is al bezet' }, { status: 409 })
      }
    }

    const { data: existing } = await supabaseAdmin.from('bookings').select('tijd, duur').eq('barber_id', session.id).eq('datum', datum).eq('geannuleerd', false).neq('id', id)
    const tEnd = tStart + dur
    for (const b of existing ?? []) {
      const [bh, bm] = b.tijd.split(':').map(Number)
      const bStart = bh * 60 + bm
      if (bStart < tEnd && tStart < bStart + b.duur) return Response.json({ error: 'Dit tijdslot is al bezet' }, { status: 409 })
    }
  }

  const normEmail = email ? email.toLowerCase() : ''
  const { data: updated, error } = await supabaseAdmin.from('bookings').update({
    naam, telefoon, email: normEmail, service, prijs, duur, datum, tijd, notities: notities ?? null,
  }).eq('id', id).eq('barber_id', session.id).select('code').single()
  if (error) return Response.json({ error: 'Bijwerken mislukt' }, { status: 500 })

  if (normEmail && updated?.code) {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const { data: barber } = await supabaseAdmin.from('barbers').select('naam, slug').eq('id', session.id).single()
    const annuleerUrl = `${base}/${barber?.slug ?? ''}?annuleer=${updated.code}`
    const verzetUrl   = `${base}/${barber?.slug ?? ''}?verzet=${updated.code}`
    sendMail({
      to: normEmail,
      subject: `Afspraak bijgewerkt – ${updated.code}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#2176d4;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:24px;">✂ ${esc(barber?.naam ?? 'Schuurtje')}</h1>
          </div>
          <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
            <h2 style="color:#2176d4;margin-top:0;">Afspraak bijgewerkt</h2>
            <p>Hallo <strong>${esc(naam)}</strong>, uw afspraak is bijgewerkt.</p>
            <div style="background:#dbeafe;border-radius:10px;padding:20px;margin:20px 0;">
              <p style="margin:6px 0;"><strong>Boekingscode:</strong> <span style="font-size:18px;font-weight:800;color:#2176d4;">${updated.code}</span></p>
              <p style="margin:6px 0;"><strong>Dienst:</strong> ${esc(service)}</p>
              <p style="margin:6px 0;"><strong>Datum:</strong> ${formatDateNL(datum)}</p>
              <p style="margin:6px 0;"><strong>Tijd:</strong> ${tijd}</p>
              <p style="margin:6px 0;"><strong>Prijs:</strong> €${prijs ?? 0}</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${verzetUrl}" style="display:block;background:#2176d4;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:10px;">Afspraak verzetten</a>
              <a href="${annuleerUrl}" style="display:block;background:#dc2626;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;">Afspraak annuleren</a>
            </div>
          </div>
        </div>`,
    }).catch(() => {})
  }

  return Response.json({ ok: true })
}
