import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

const FROM = process.env.SMTP_FROM ?? 'Schuurtje <noreply@schuurtje.nl>'

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const NL_DAYS = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']
const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']

function formatDateNL(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${NL_DAYS[d.getDay()]} ${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  await transporter.sendMail({ from: FROM, ...opts })
}

export async function stuurBevestiging(opts: {
  naar: string; naam: string; kapperNaam: string; service: string
  datum: string; tijd: string; prijs: number; code: string; slug: string; baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const verzetUrl   = `${opts.baseUrl}/${opts.slug}?verzet=${opts.code}`

  await sendMail({
    to: opts.naar,
    subject: `Afspraak bevestigd – ${opts.code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#2176d4;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">✂ ${esc(opts.kapperNaam)}</h1>
        </div>
        <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <h2 style="color:#2176d4;margin-top:0;">Afspraak bevestigd!</h2>
          <p>Hallo <strong>${esc(opts.naam)}</strong>, uw afspraak is bevestigd.</p>
          <div style="background:#dbeafe;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:6px 0;"><strong>Boekingscode:</strong> <span style="font-size:18px;font-weight:800;color:#2176d4;">${opts.code}</span></p>
            <p style="margin:6px 0;"><strong>Dienst:</strong> ${esc(opts.service)}</p>
            <p style="margin:6px 0;"><strong>Datum:</strong> ${formatDateNL(opts.datum)}</p>
            <p style="margin:6px 0;"><strong>Tijd:</strong> ${opts.tijd}</p>
            <p style="margin:6px 0;"><strong>Prijs:</strong> €${opts.prijs}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${verzetUrl}" style="display:block;background:#2176d4;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:10px;">Afspraak verzetten</a>
            <a href="${annuleerUrl}" style="display:block;background:#dc2626;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;">Afspraak annuleren</a>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;">Of gebruik boekingscode <strong>${opts.code}</strong> op de website.</p>
        </div>
      </div>`,
  })
}

export function cancelMailHtml(b: { naam: string; code: string; service: string; datum: string; tijd: string; kapperNaam?: string }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:#dc2626;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">✂ ${esc(b.kapperNaam ?? 'Schuurtje')}</h1>
      </div>
      <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
        <h2 style="color:#dc2626;margin-top:0;">Afspraak geannuleerd</h2>
        <p>Hallo <strong>${esc(b.naam)}</strong>, uw afspraak is geannuleerd.</p>
        <div style="background:#fee2e2;border-radius:10px;padding:20px;margin:20px 0;">
          <p style="margin:6px 0;"><strong>Code:</strong> ${b.code}</p>
          <p style="margin:6px 0;"><strong>Dienst:</strong> ${esc(b.service)}</p>
          <p style="margin:6px 0;"><strong>Datum:</strong> ${formatDateNL(b.datum)}</p>
          <p style="margin:6px 0;"><strong>Tijd:</strong> ${b.tijd}</p>
        </div>
        <p style="color:#888;font-size:13px;">Wilt u een nieuwe afspraak maken? Ga naar onze website.</p>
      </div>
    </div>`
}

export async function stuurAnnuleringsBevestiging(opts: {
  naar: string; naam: string; kapperNaam: string; service: string; datum: string; tijd: string; code: string
}) {
  await sendMail({
    to: opts.naar,
    subject: `Afspraak geannuleerd – ${opts.code}`,
    html: cancelMailHtml({ naam: opts.naam, code: opts.code, service: opts.service, datum: opts.datum, tijd: opts.tijd, kapperNaam: opts.kapperNaam }),
  })
}

export async function stuurVerzetBevestiging(opts: {
  naar: string; naam: string; kapperNaam: string; service: string
  nieuweDatum: string; nieuweTijd: string; code: string; slug: string; baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const verzetUrl   = `${opts.baseUrl}/${opts.slug}?verzet=${opts.code}`

  await sendMail({
    to: opts.naar,
    subject: `Afspraak verzet – ${opts.code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#2176d4;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">✂ ${esc(opts.kapperNaam)}</h1>
        </div>
        <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <h2 style="color:#2176d4;margin-top:0;">Afspraak verzet</h2>
          <p>Hallo <strong>${esc(opts.naam)}</strong>, uw afspraak is succesvol verzet.</p>
          <div style="background:#dbeafe;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:6px 0;"><strong>Boekingscode:</strong> <span style="font-size:18px;font-weight:800;color:#2176d4;">${opts.code}</span></p>
            <p style="margin:6px 0;"><strong>Dienst:</strong> ${esc(opts.service)}</p>
            <p style="margin:6px 0;"><strong>Nieuwe datum:</strong> ${formatDateNL(opts.nieuweDatum)}</p>
            <p style="margin:6px 0;"><strong>Nieuwe tijd:</strong> ${opts.nieuweTijd}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${verzetUrl}" style="display:block;background:#2176d4;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:10px;">Opnieuw verzetten</a>
            <a href="${annuleerUrl}" style="display:block;background:#dc2626;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;">Afspraak annuleren</a>
          </div>
        </div>
      </div>`,
  })
}

export async function stuurHerinneringsMail(opts: {
  naar: string; naam: string; kapperNaam: string; service: string
  datum: string; tijd: string; prijs: number; code: string; slug: string; baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`

  await sendMail({
    to: opts.naar,
    subject: `Herinnering: uw afspraak morgen – ${opts.code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#2176d4;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">✂ ${esc(opts.kapperNaam)}</h1>
        </div>
        <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <h2 style="color:#2176d4;margin-top:0;">Herinnering afspraak morgen</h2>
          <p>Hallo <strong>${esc(opts.naam)}</strong>, dit is een herinnering voor uw afspraak van morgen.</p>
          <div style="background:#dbeafe;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:6px 0;"><strong>Boekingscode:</strong> <span style="font-size:18px;font-weight:800;color:#2176d4;">${opts.code}</span></p>
            <p style="margin:6px 0;"><strong>Dienst:</strong> ${esc(opts.service)}</p>
            <p style="margin:6px 0;"><strong>Datum:</strong> ${formatDateNL(opts.datum)}</p>
            <p style="margin:6px 0;"><strong>Tijd:</strong> ${opts.tijd}</p>
            <p style="margin:6px 0;"><strong>Prijs:</strong> €${opts.prijs}</p>
          </div>
          <p style="color:#555;">Kunt u niet komen? Annuleer dan zo snel mogelijk.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${annuleerUrl}" style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px;">Afspraak annuleren</a>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;">Tot morgen bij ${esc(opts.kapperNaam)}!</p>
        </div>
      </div>`,
  })
}

export async function stuurWachtlijstBevestiging(opts: {
  naar: string; naam: string; kapperNaam: string; service: string
  datum: string; tijd: string; prijs: number; code: string; slug: string; baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const verzetUrl   = `${opts.baseUrl}/${opts.slug}?verzet=${opts.code}`

  await sendMail({
    to: opts.naar,
    subject: `Je bent ingepland – ${opts.code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#2176d4;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">✂ ${esc(opts.kapperNaam)}</h1>
        </div>
        <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <h2 style="color:#2176d4;margin-top:0;">Je bent ingepland!</h2>
          <p>Hallo <strong>${esc(opts.naam)}</strong>, goed nieuws — je staat nu ingepland.</p>
          <div style="background:#dbeafe;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:6px 0;"><strong>Boekingscode:</strong> <span style="font-size:18px;font-weight:800;color:#2176d4;">${opts.code}</span></p>
            <p style="margin:6px 0;"><strong>Dienst:</strong> ${esc(opts.service)}</p>
            <p style="margin:6px 0;"><strong>Datum:</strong> ${formatDateNL(opts.datum)}</p>
            <p style="margin:6px 0;"><strong>Tijd:</strong> ${opts.tijd}</p>
            <p style="margin:6px 0;"><strong>Prijs:</strong> €${opts.prijs}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${verzetUrl}" style="display:block;background:#2176d4;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:10px;">Afspraak verzetten</a>
            <a href="${annuleerUrl}" style="display:block;background:#dc2626;color:#fff;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;">Afspraak annuleren</a>
          </div>
        </div>
      </div>`,
  })
}
