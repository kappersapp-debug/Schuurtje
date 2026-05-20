import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import type { KapperSession, AdminSession } from './types'

const SECRET = process.env.AUTH_SECRET!
const COOKIE_KAPPER = 'schuurtje_session'
const COOKIE_ADMIN = 'schuurtje_admin'
const TTL = 60 * 60 * 8 // 8 uur

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url')
}

function makeToken(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = sign(payload)
  return `${payload}.${sig}`
}

function verifyToken(token: string): unknown | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(payload)
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return null
  }
}

export function createKapperToken(session: Omit<KapperSession, 'exp'>): string {
  return makeToken({ ...session, exp: Math.floor(Date.now() / 1000) + TTL })
}

export function createAdminToken(): string {
  return makeToken({ role: 'admin', exp: Math.floor(Date.now() / 1000) + TTL })
}

export async function getKapperSession(): Promise<KapperSession | null> {
  const store = await cookies()
  const token = store.get(COOKIE_KAPPER)?.value
  if (!token) return null
  const data = verifyToken(token) as KapperSession | null
  if (!data || data.exp < Math.floor(Date.now() / 1000)) return null
  return data
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies()
  const token = store.get(COOKIE_ADMIN)?.value
  if (!token) return null
  const data = verifyToken(token) as AdminSession | null
  if (!data || data.role !== 'admin' || data.exp < Math.floor(Date.now() / 1000)) return null
  return data
}

export { COOKIE_KAPPER, COOKIE_ADMIN, TTL }
