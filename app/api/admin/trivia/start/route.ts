// app/api/admin/trivia/start/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ ok: false, error: 'Missing question id' }, { status: 400 })
    const s = createServerClient()

    await s.from('trivia_sessions')
      .upsert({ id: 1, active: false, active_question_id: null, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    const { error: upErr } = await s
      .from('trivia_sessions')
      .update({ active: true, active_question_id: id, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (upErr) throw upErr

    await s.from('trivia_buzzes').delete().neq('id', 0)

    return NextResponse.json({ ok: true, sessionId: 1 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'start failed' }, { status: 500 })
  }
}
