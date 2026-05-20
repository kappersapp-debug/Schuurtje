export const dynamic = 'force-dynamic'

import { getKapperSession } from '@/lib/auth'

export async function GET() {
  const session = await getKapperSession()
  if (!session) return Response.json({ session: null })
  return Response.json({ session })
}
