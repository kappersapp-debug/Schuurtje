export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const form = await req.formData()
  const file = form.get('foto') as File | null
  if (!file || file.size === 0) return Response.json({ error: 'Geen bestand' }, { status: 400 })
  if (!file.type.startsWith('image/')) return Response.json({ error: 'Alleen afbeeldingen' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: 'Max 5MB' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('Profiel foto')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('Profiel foto').getPublicUrl(path)
  await supabaseAdmin.from('barbers').update({ foto_url: data.publicUrl }).eq('id', id)

  return Response.json({ ok: true, foto_url: data.publicUrl })
}
