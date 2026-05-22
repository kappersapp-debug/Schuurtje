import { supabaseAdmin } from '@/lib/supabase'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data: kappers } = await supabaseAdmin
    .from('barbers')
    .select('id, naam, slug, bio, foto_url')
    .eq('actief', true)
    .order('naam')

  const { data: reviewRows } = await supabaseAdmin
    .from('reviews')
    .select('barber_id, rating')

  const ratingMap: Record<string, { som: number; aantal: number }> = {}
  for (const r of reviewRows ?? []) {
    if (!ratingMap[r.barber_id]) ratingMap[r.barber_id] = { som: 0, aantal: 0 }
    ratingMap[r.barber_id].som += r.rating
    ratingMap[r.barber_id].aantal += 1
  }

  const kappersMetRating = (kappers ?? []).map(k => ({
    ...k,
    rating: ratingMap[k.id] ? ratingMap[k.id].som / ratingMap[k.id].aantal : null,
    aantalReviews: ratingMap[k.id]?.aantal ?? 0,
  }))

  return <HomeClient kappers={kappersMetRating} />
}
