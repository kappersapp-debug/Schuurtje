import { COOKIE_KAPPER } from '@/lib/auth'

export async function POST() {
  const res = Response.json({ ok: true })
  res.headers.set('Set-Cookie', `${COOKIE_KAPPER}=; Path=/; HttpOnly; Max-Age=0`)
  return res
}
