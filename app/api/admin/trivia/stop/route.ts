// app/api/admin/trivia/stop/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const s = createServerClient()

    await s.from('trivia_sessions')
      .upsert({ id: 1, active: false, active_question_id: null, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    const { error: upErr } = await s
      .from('trivia_sessions')
      .update({ active: false, active_question_id: null, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (upErr) throw upErr

    await s.from('trivia_buzzes').delete().neq('id', 0)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'stop failed' }, { status: 500 })
  }
}
