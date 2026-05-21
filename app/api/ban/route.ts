export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getKapperSession } from '@/lib/auth'
import { sendMail } from '@/lib/mailer'

const NL_DAYS = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']
const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
function formatDateNL(ds: string) {
  const d = new Date(ds + 'T12:00:00')
  return `${NL_DAYS[d.getDay()]} ${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('banned_emails').select('*')
    .eq('barber_id', session.id)
    .order('created_at', { ascending: false })

  return Response.json({ gebanned: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { email, reden } = await req.json().catch(() => ({}))
  if (!email) return Response.json({ error: 'email verplicht' }, { status: 400 })

  const lowerEmail = email.toLowerCase()
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).split(' ')[0]

  const { error } = await supabaseAdmin.from('banned_emails').upsert(
    { barber_id: session.id, email: lowerEmail, reden: reden ?? null },
    { onConflict: 'barber_id,email' }
  )
  if (error) return Response.json({ error: 'Fout bij bannen' }, { status: 500 })

  // Cancel all future bookings for this email
  const { data: bookings } = await supabaseAdmin
    .from('bookings').select('id, code, naam, service, datum, tijd, duur, prijs, telefoon')
    .eq('barber_id', session.id).eq('email', lowerEmail)
    .eq('geannuleerd', false).gte('datum', today)

  if (bookings && bookings.length > 0) {
    await supabaseAdmin.from('bookings').update({ geannuleerd: true })
      .eq('barber_id', session.id).eq('email', lowerEmail).gte('datum', today)

    const { data: barber } = await supabaseAdmin.from('barbers').select('naam').eq('id', session.id).single()

    for (const b of bookings) {
      await supabaseAdmin.from('cancelled_bookings').insert({
        barber_id: session.id, code: b.code, naam: b.naam, email: lowerEmail,
        telefoon: b.telefoon ?? '', service: b.service, prijs: b.prijs ?? 0,
        datum: b.datum, tijd: b.tijd, duur: b.duur, reden: 'Klant gebanned',
      }).then(undefined, () => {})

      sendMail({
        to: lowerEmail,
        subject: `Afspraak geannuleerd – ${b.code}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
            <div style="background:#dc2626;padding:24px 32px;border-radius:12px 12px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:24px;">✂ ${esc(barber?.naam ?? 'Schuurtje')}</h1>
            </div>
            <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
              <h2 style="color:#dc2626;margin-top:0;">Afspraak geannuleerd</h2>
              <p>Helaas is uw afspraak geannuleerd.</p>
              <div style="background:#fee2e2;border-radius:10px;padding:16px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>Code:</strong> ${b.code}</p>
                <p style="margin:4px 0;"><strong>Dienst:</strong> ${esc(b.service)}</p>
                <p style="margin:4px 0;"><strong>Datum:</strong> ${formatDateNL(b.datum)}</p>
                <p style="margin:4px 0;"><strong>Tijd:</strong> ${b.tijd}</p>
              </div>
            </div>
          </div>`,
      }).catch(() => {})
    }
  }

  return Response.json({ ok: true, afspraken_geannuleerd: bookings?.length ?? 0 })
}

export async function DELETE(req: NextRequest) {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'id verplicht' }, { status: 400 })

  await supabaseAdmin.from('banned_emails').delete()
    .eq('barber_id', session.id).eq('id', id)

  return Response.json({ ok: true })
}
