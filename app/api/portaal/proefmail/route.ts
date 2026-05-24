export const dynamic = 'force-dynamic'

import { getKapperSession } from '@/lib/auth'
import { sendMail } from '@/lib/mailer'

export async function POST() {
  const session = await getKapperSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  try {
    await sendMail({
      to: session.email,
      subject: 'Proefmail — Schuurtje e-mail werkt correct',
      html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proefmail</title></head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;max-width:560px;width:100%;">
<tr><td style="background:#2176d4;padding:32px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">Schuurtje</h1>
</td></tr>
<tr><td style="padding:32px;">
<h2 style="margin:0 0 12px;color:#fff;font-size:20px;font-weight:700;">E-mail werkt correct ✓</h2>
<p style="margin:0 0 16px;color:#aaa;font-size:14px;line-height:1.6;">
Hoi ${session.naam},<br><br>
Dit is een proefmail vanuit jouw Schuurtje portaal. Als je dit bericht ontvangt, werkt de e-mailconfiguratie correct.
</p>
<p style="margin:0;color:#666;font-size:12px;">Je ontvangt klantmeldingen op dit adres: <strong style="color:#aaa;">${session.email}</strong></p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #2a2a2a;text-align:center;">
<p style="margin:0;color:#555;font-size:11px;">Schuurtje — kappers platform</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
    })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Verzenden mislukt' }, { status: 500 })
  }
}
