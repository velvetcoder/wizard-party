import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const s = createServerClient()
    const { data, error } = await s.rpc('duel_draw_next')
    if (error) throw error
    // When deck exhausted, data will be null
    return NextResponse.json({ ok: true, spell: data })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message ?? 'draw failed' }, { status: 500 })
  }
}
