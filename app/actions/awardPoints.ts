'use server'
import { createServerClient } from '@/lib/supabase/server'
export async function awardPoints(house: 'Gryffindor'|'Ravenclaw'|'Hufflepuff'|'Slytherin', delta: number, reason = '') {
  const s = await createServerClient()
  const { data: current } = await s.from('house_points').select('*').eq('house', house).maybeSingle()
  const newPoints = (current?.points ?? 0) + delta
  await s.from('house_points').upsert({ house, points: newPoints })
  await s.from('points_log').insert({ house, delta, reason })
  return { ok: true, newPoints }
}
