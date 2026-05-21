import { supabaseAdmin } from '@/lib/supabase'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data: kappers } = await supabaseAdmin
    .from('barbers')
    .select('id, naam, slug, bio, foto_url')
    .eq('actief', true)
    .order('naam')

  return <HomeClient kappers={kappers ?? []} />
}
