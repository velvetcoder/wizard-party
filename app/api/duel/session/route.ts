import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const s = createServerClient()
  const { data, error } = await s.from('duel_session').select('*').eq('id', 1).maybeSingle()
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 })
  return NextResponse.json({ ok:true, data })
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}))
    const s = createServerClient()

    // read current row to merge
    const { data: current } = await s
      .from('duel_session')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    // Only replace fields that are explicitly provided.
    // Everything else stays as-is.
    const merged = {
      id: 1,
      active: (payload.active ?? current?.active) ?? false,
      current_spell: (payload.hasOwnProperty('current_spell') ? payload.current_spell : current?.current_spell) ?? null,
      options: (payload.hasOwnProperty('options') ? payload.options : current?.options) ?? null,
      reveal: (payload.hasOwnProperty('reveal') ? payload.reveal : current?.reveal) ?? false,
      winner_house: (payload.hasOwnProperty('winner_house') ? payload.winner_house : current?.winner_house) ?? null,
      updated_at: new Date().toISOString(),
    }

    const { error: upErr, data } = await s
      .from('duel_session')
      .upsert(merged, { onConflict: 'id' })
      .select()
      .maybeSingle()

    if (upErr) throw upErr
    return NextResponse.json({ ok:true, data })
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e?.message ?? 'update failed' }, { status:500 })
  }
}
