import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const s = createServerClient()
    const { error } = await s.rpc('duel_reset_deck')
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message ?? 'reset failed' }, { status: 500 })
  }
}
