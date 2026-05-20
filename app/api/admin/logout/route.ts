import { COOKIE_ADMIN } from '@/lib/auth'

export async function POST() {
  const res = Response.json({ ok: true })
  res.headers.set('Set-Cookie', `${COOKIE_ADMIN}=; Path=/; HttpOnly; Max-Age=0`)
  return res
}
