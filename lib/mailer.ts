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

const NL_DAYS   = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']
const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']

function formatDateNL(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${NL_DAYS[d.getDay()]} ${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/* ─── Shared template wrapper ───────────────────────────────── */
function base(kapperNaam: string, body: string, headerColor = '#2176d4'): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(kapperNaam)}</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c0c0c;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

        <!-- Header -->
        <tr>
          <td style="background:#111111;border-radius:16px 16px 0 0;padding:22px 32px;border-bottom:2px solid ${headerColor}">
            <span style="color:${headerColor};font-size:22px;margin-right:10px;font-weight:900">✂</span>
            <span style="color:#ffffff;font-weight:800;font-size:18px;letter-spacing:1.5px;text-transform:uppercase">${esc(kapperNaam)}</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#141414;padding:32px;border-left:1px solid #222;border-right:1px solid #222">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f0f0f;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;border:1px solid #222;border-top:1px solid #1e1e1e">
            <p style="margin:0;color:#4b5563;font-size:12px;line-height:1.5">
              ${esc(kapperNaam)} &middot; Online boekingssysteem<br>
              <span style="color:#374151">Dit e-mailadres is niet bereikbaar — antwoord niet op dit bericht.</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ─── Info rows block ───────────────────────────────────────── */
function infoTable(rows: [string, string][]): string {
  const rowsHtml = rows.map(([label, value], i) => `
    <tr>
      <td style="padding:11px 16px;color:#9ca3af;font-size:14px;${i < rows.length - 1 ? 'border-bottom:1px solid #2a2a2a' : ''}">${label}</td>
      <td style="padding:11px 16px;color:#f3f4f6;font-size:14px;font-weight:600;text-align:right;${i < rows.length - 1 ? 'border-bottom:1px solid #2a2a2a' : ''}">${value}</td>
    </tr>`).join('')
  return `<div style="border-radius:12px;overflow:hidden;background:#1e1e1e;margin-bottom:24px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>
  </div>`
}

/* ─── Code block ────────────────────────────────────────────── */
function codeBlock(code: string): string {
  return `<div style="background:#0a1628;border:1.5px solid #2176d4;border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:24px">
    <p style="margin:0 0 6px;color:#6b96d6;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Boekingscode</p>
    <p style="margin:0;color:#2176d4;font-size:30px;font-weight:900;letter-spacing:6px;font-family:'Courier New',Courier,monospace">${esc(code)}</p>
  </div>`
}

/* ─── Button ────────────────────────────────────────────────── */
function btn(text: string, url: string, color = '#2176d4'): string {
  return `<a href="${url}" style="display:block;background:${color};color:#ffffff;font-weight:700;font-size:14px;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:8px">${text}</a>`
}

/* ─── sendMail ──────────────────────────────────────────────── */
export async function sendMail(opts: { to: string; subject: string; html: string }) {
  await transporter.sendMail({ from: FROM, ...opts })
}

/* ─── 1. Verificatiecode ────────────────────────────────────── */
export async function stuurVerificatieMail(opts: { naar: string; code: string; kapperNaam: string }) {
  const body = `
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px">Verificatiecode</h1>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 28px">Gebruik onderstaande code om uw boeking te bevestigen bij <strong style="color:#f3f4f6">${esc(opts.kapperNaam)}</strong>.</p>

    <div style="background:#0a1628;border:1.5px solid #2176d4;border-radius:14px;padding:32px 24px;text-align:center;margin-bottom:24px">
      <p style="margin:0 0 8px;color:#6b96d6;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Uw code</p>
      <p style="margin:0;color:#2176d4;font-size:48px;font-weight:900;letter-spacing:12px;font-family:'Courier New',Courier,monospace">${esc(opts.code)}</p>
    </div>

    <div style="background:#1a1a1a;border-radius:10px;padding:14px 18px;margin-bottom:8px">
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5">
        &#9203; Geldig voor <strong style="color:#9ca3af">10 minuten</strong><br>
        &#128274; Deel deze code met niemand
      </p>
    </div>`

  await sendMail({
    to: opts.naar,
    subject: `Verificatiecode – ${opts.kapperNaam}`,
    html: base(opts.kapperNaam, body),
  })
}

/* ─── 2. Bevestiging ────────────────────────────────────────── */
export async function stuurBevestiging(opts: {
  naar: string; naam: string; kapperNaam: string; service: string
  datum: string; tijd: string; prijs: number; code: string; slug: string; baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const verzetUrl   = `${opts.baseUrl}/${opts.slug}?verzet=${opts.code}`
  const reviewUrl   = `${opts.baseUrl}/beoordeling?code=${opts.code}`

  const body = `
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px">Afspraak bevestigd &#10003;</h1>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 28px">Hallo <strong style="color:#f3f4f6">${esc(opts.naam)}</strong>, uw afspraak staat vast.</p>

    ${codeBlock(opts.code)}

    ${infoTable([
      ['Dienst', esc(opts.service)],
      ['Datum',  formatDateNL(opts.datum)],
      ['Tijd',   opts.tijd],
      ['Prijs',  `&euro;${opts.prijs}`],
    ])}

    <p style="color:#6b7280;font-size:13px;margin:0 0 16px">Plannen gewijzigd? Gebruik de knoppen hieronder.</p>

    ${btn('Afspraak verzetten', verzetUrl)}
    ${btn('Afspraak annuleren', annuleerUrl, '#dc2626')}

    <div style="background:#1a1a1a;border-radius:10px;padding:16px 18px;margin-top:20px;text-align:center">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px">Tevreden? Laat een beoordeling achter na uw afspraak:</p>
      <a href="${reviewUrl}" style="color:#f59e0b;font-weight:700;font-size:14px;text-decoration:none">&#9733; Beoordeling achterlaten</a>
    </div>`

  await sendMail({
    to: opts.naar,
    subject: `Afspraak bevestigd – ${opts.code}`,
    html: base(opts.kapperNaam, body),
  })
}

/* ─── 3. Annulering ─────────────────────────────────────────── */
export function cancelMailHtml(b: {
  naam: string; code: string; service: string; datum: string; tijd: string; kapperNaam?: string; baseUrl?: string; slug?: string
}): string {
  const naam = b.kapperNaam ?? 'Schuurtje'
  const newUrl = b.baseUrl && b.slug ? `${b.baseUrl}/${b.slug}` : null

  const body = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:#2a0a0a;border:1.5px solid #7f1d1d;border-radius:50%;width:52px;height:52px;line-height:52px;text-align:center;font-size:22px">&#10008;</div>
    </div>

    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px;text-align:center">Afspraak geannuleerd</h1>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 28px;text-align:center">Hallo <strong style="color:#f3f4f6">${esc(b.naam)}</strong>, uw afspraak is geannuleerd.</p>

    ${infoTable([
      ['Boekingscode', `<span style="font-family:'Courier New',monospace;color:#f3f4f6">${esc(b.code)}</span>`],
      ['Dienst',  esc(b.service)],
      ['Datum',   formatDateNL(b.datum)],
      ['Tijd',    b.tijd],
    ])}

    ${newUrl ? `<div style="text-align:center;margin-top:20px">${btn('Nieuwe afspraak maken', newUrl)}</div>` : ''}`

  return base(naam, body, '#dc2626')
}

export async function stuurAnnuleringsBevestiging(opts: {
  naar: string; naam: string; kapperNaam: string; service: string; datum: string; tijd: string; code: string; baseUrl?: string; slug?: string
}) {
  await sendMail({
    to: opts.naar,
    subject: `Afspraak geannuleerd – ${opts.code}`,
    html: cancelMailHtml({
      naam: opts.naam, code: opts.code, service: opts.service,
      datum: opts.datum, tijd: opts.tijd, kapperNaam: opts.kapperNaam,
      baseUrl: opts.baseUrl, slug: opts.slug,
    }),
  })
}

/* ─── 4. Verzet ─────────────────────────────────────────────── */
export async function stuurVerzetBevestiging(opts: {
  naar: string; naam: string; kapperNaam: string; service: string
  nieuweDatum: string; nieuweTijd: string; prijs: number; code: string; slug: string; baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const verzetUrl   = `${opts.baseUrl}/${opts.slug}?verzet=${opts.code}`

  const body = `
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px">Afspraak verzet &#8635;</h1>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 28px">Hallo <strong style="color:#f3f4f6">${esc(opts.naam)}</strong>, uw afspraak is succesvol verzet naar een nieuw tijdstip.</p>

    ${codeBlock(opts.code)}

    ${infoTable([
      ['Dienst',       esc(opts.service)],
      ['Nieuwe datum', formatDateNL(opts.nieuweDatum)],
      ['Nieuwe tijd',  opts.nieuweTijd],
      ['Prijs',        `&euro;${opts.prijs}`],
    ])}

    <p style="color:#6b7280;font-size:13px;margin:0 0 16px">Toch andere plannen? Gebruik de knoppen hieronder.</p>

    ${btn('Nogmaals verzetten', verzetUrl)}
    ${btn('Afspraak annuleren', annuleerUrl, '#dc2626')}`

  await sendMail({
    to: opts.naar,
    subject: `Afspraak verzet – ${opts.code}`,
    html: base(opts.kapperNaam, body),
  })
}

/* ─── 5. Herinnering ────────────────────────────────────────── */
export async function stuurHerinneringsMail(opts: {
  naar: string; naam: string; kapperNaam: string; service: string
  datum: string; tijd: string; prijs: number; code: string; slug: string; baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const reviewUrl   = `${opts.baseUrl}/beoordeling?code=${opts.code}`

  const body = `
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px">Herinnering: morgen een afspraak &#128276;</h1>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 28px">Hallo <strong style="color:#f3f4f6">${esc(opts.naam)}</strong>, vergeet uw afspraak morgen niet.</p>

    ${codeBlock(opts.code)}

    ${infoTable([
      ['Dienst', esc(opts.service)],
      ['Datum',  formatDateNL(opts.datum)],
      ['Tijd',   opts.tijd],
      ['Prijs',  `&euro;${opts.prijs}`],
    ])}

    <p style="color:#6b7280;font-size:13px;margin:0 0 16px">Kunt u toch niet komen? Annuleer dan zo vroeg mogelijk.</p>
    ${btn('Afspraak annuleren', annuleerUrl, '#dc2626')}

    <div style="background:#1a1a1a;border-radius:10px;padding:16px 18px;margin-top:20px;text-align:center">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px">Na uw afspraak kunt u een beoordeling achterlaten:</p>
      <a href="${reviewUrl}" style="color:#f59e0b;font-weight:700;font-size:14px;text-decoration:none">&#9733; Beoordeling achterlaten</a>
    </div>`

  await sendMail({
    to: opts.naar,
    subject: `Herinnering: uw afspraak morgen – ${opts.code}`,
    html: base(opts.kapperNaam, body),
  })
}

/* ─── 6. Wachtlijst ingepland ───────────────────────────────── */
export async function stuurWachtlijstBevestiging(opts: {
  naar: string; naam: string; kapperNaam: string; service: string
  datum: string; tijd: string; prijs: number; code: string; slug: string; baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const verzetUrl   = `${opts.baseUrl}/${opts.slug}?verzet=${opts.code}`

  const body = `
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px">Je bent ingepland &#127881;</h1>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 28px">Hallo <strong style="color:#f3f4f6">${esc(opts.naam)}</strong>, goed nieuws — er is een plek vrijgekomen en je staat nu ingepland!</p>

    ${codeBlock(opts.code)}

    ${infoTable([
      ['Dienst', esc(opts.service)],
      ['Datum',  formatDateNL(opts.datum)],
      ['Tijd',   opts.tijd],
      ['Prijs',  `&euro;${opts.prijs}`],
    ])}

    ${btn('Afspraak verzetten', verzetUrl)}
    ${btn('Afspraak annuleren', annuleerUrl, '#dc2626')}`

  await sendMail({
    to: opts.naar,
    subject: `Je bent ingepland – ${opts.code}`,
    html: base(opts.kapperNaam, body),
  })
}
