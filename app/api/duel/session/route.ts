import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const s = createServerClient()
    const { data, error } = await s
      .from('duel_session')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error) throw error

    // if no row yet, create a default inactive one:
    if (!data) {
      const init = { id: 1, active: false, current_spell: null, options: null, updated_at: new Date().toISOString() }
      const { error: insErr } = await s.from('duel_session').upsert(init)
      if (insErr) throw insErr
      return NextResponse.json({ ok: true, data: init })
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'read failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}))
    const active = !!payload?.active
    const current_spell = payload?.current_spell ?? null
    const options = Array.isArray(payload?.options) ? payload.options : null

    const s = createServerClient()
    const up = { id: 1, active, current_spell, options, updated_at: new Date().toISOString() }

    const { error } = await s.from('duel_session').upsert(up)
    if (error) throw error

    return NextResponse.json({ ok: true, data: up })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'update failed' }, { status: 500 })
  }
}
