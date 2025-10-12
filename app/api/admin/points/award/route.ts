// app/api/admin/points/award/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const house = String(payload?.house || '').trim()
    const delta = Number(payload?.delta)
    const reason = (payload?.reason ? String(payload.reason) : '').slice(0, 200)
    const display_name = (payload?.display_name ? String(payload.display_name) : '').slice(0, 80)

    const ALLOWED = ['Gryffindor', 'Ravenclaw', 'Hufflepuff', 'Slytherin']
    if (!ALLOWED.includes(house)) {
      return NextResponse.json({ ok: false, error: 'Invalid house' }, { status: 400 })
    }
    if (!Number.isFinite(delta)) {
      return NextResponse.json({ ok: false, error: 'Invalid delta' }, { status: 400 })
    }

    const s = createServerClient()

    // ✅ Atomic increment via RPC (also ensures row exists)
    const { data: updated, error: rpcErr } = await s.rpc('increment_house_points', {
      p_house: house,
      p_delta: delta,
    })
    if (rpcErr) throw rpcErr

    // Log the award (for history)
    const { error: logErr } = await s.from('points_log').insert([
      { house, delta, reason: reason || `Trivia award${display_name ? ` — ${display_name}` : ''}` }
    ])
    if (logErr) throw logErr

    // 'updated' is an array with one row from the RPC SELECT
    const current = Array.isArray(updated) ? updated[0] : null
    return NextResponse.json({ ok: true, current })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'award failed' }, { status: 500 })
  }
}
