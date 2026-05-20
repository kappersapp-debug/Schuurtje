import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = process.env.SMTP_FROM ?? 'Schuurtje <noreply@schuurtje.nl>'

export async function stuurBevestiging(opts: {
  naar: string
  naam: string
  kapperNaam: string
  service: string
  datum: string
  tijd: string
  prijs: number
  code: string
  slug: string
  baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const verzetUrl = `${opts.baseUrl}/${opts.slug}?verzet=${opts.code}`
  const agendaUrl = `${opts.baseUrl}/api/agenda/${opts.slug}/${opts.code}.ics`

  await transporter.sendMail({
    from: FROM,
    to: opts.naar,
    subject: `Afspraakbevestiging – ${opts.kapperNaam}`,
    html: `
      <p>Beste ${opts.naam},</p>
      <p>Je afspraak is bevestigd!</p>
      <table>
        <tr><td><strong>Kapper</strong></td><td>${opts.kapperNaam}</td></tr>
        <tr><td><strong>Dienst</strong></td><td>${opts.service}</td></tr>
        <tr><td><strong>Datum</strong></td><td>${opts.datum}</td></tr>
        <tr><td><strong>Tijd</strong></td><td>${opts.tijd}</td></tr>
        <tr><td><strong>Prijs</strong></td><td>€${opts.prijs}</td></tr>
        <tr><td><strong>Code</strong></td><td>${opts.code}</td></tr>
      </table>
      <p>
        <a href="${annuleerUrl}">Annuleren</a> &nbsp;|&nbsp;
        <a href="${verzetUrl}">Verzetten</a> &nbsp;|&nbsp;
        <a href="${agendaUrl}">Toevoegen aan agenda</a>
      </p>
      <p>Tot dan!</p>
    `,
  })
}

export async function stuurHerinneringsMail(opts: {
  naar: string
  naam: string
  kapperNaam: string
  service: string
  datum: string
  tijd: string
  code: string
  slug: string
  baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`

  await transporter.sendMail({
    from: FROM,
    to: opts.naar,
    subject: `Herinnering – morgen afspraak bij ${opts.kapperNaam}`,
    html: `
      <p>Beste ${opts.naam},</p>
      <p>Morgen heb je een afspraak bij ${opts.kapperNaam}!</p>
      <table>
        <tr><td><strong>Dienst</strong></td><td>${opts.service}</td></tr>
        <tr><td><strong>Datum</strong></td><td>${opts.datum}</td></tr>
        <tr><td><strong>Tijd</strong></td><td>${opts.tijd}</td></tr>
      </table>
      <p><a href="${annuleerUrl}">Toch annuleren?</a></p>
    `,
  })
}

export async function stuurAnnuleringsBevestiging(opts: {
  naar: string
  naam: string
  kapperNaam: string
  service: string
  datum: string
  tijd: string
}) {
  await transporter.sendMail({
    from: FROM,
    to: opts.naar,
    subject: `Afspraak geannuleerd – ${opts.kapperNaam}`,
    html: `
      <p>Beste ${opts.naam},</p>
      <p>Je afspraak is geannuleerd.</p>
      <table>
        <tr><td><strong>Kapper</strong></td><td>${opts.kapperNaam}</td></tr>
        <tr><td><strong>Dienst</strong></td><td>${opts.service}</td></tr>
        <tr><td><strong>Datum</strong></td><td>${opts.datum}</td></tr>
        <tr><td><strong>Tijd</strong></td><td>${opts.tijd}</td></tr>
      </table>
      <p>Wil je opnieuw boeken? Ga naar onze website.</p>
    `,
  })
}

export async function stuurVerzetBevestiging(opts: {
  naar: string
  naam: string
  kapperNaam: string
  service: string
  nieuweDatum: string
  nieuweTijd: string
  code: string
  slug: string
  baseUrl: string
}) {
  const annuleerUrl = `${opts.baseUrl}/${opts.slug}?annuleer=${opts.code}`
  const agendaUrl = `${opts.baseUrl}/api/agenda/${opts.slug}/${opts.code}.ics`

  await transporter.sendMail({
    from: FROM,
    to: opts.naar,
    subject: `Afspraak verzet – ${opts.kapperNaam}`,
    html: `
      <p>Beste ${opts.naam},</p>
      <p>Je afspraak is verzet!</p>
      <table>
        <tr><td><strong>Nieuwe datum</strong></td><td>${opts.nieuweDatum}</td></tr>
        <tr><td><strong>Nieuwe tijd</strong></td><td>${opts.nieuweTijd}</td></tr>
        <tr><td><strong>Dienst</strong></td><td>${opts.service}</td></tr>
      </table>
      <p>
        <a href="${annuleerUrl}">Annuleren</a> &nbsp;|&nbsp;
        <a href="${agendaUrl}">Toevoegen aan agenda</a>
      </p>
    `,
  })
}
