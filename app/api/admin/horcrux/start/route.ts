import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const s = createServerClient()

    // Ensure row exists
    await s.from('horcrux_session')
      .upsert({ id: 1, active: false, updated_at: new Date().toISOString() })

    // Flip to active
    const { data, error } = await s.from('horcrux_session')
      .update({ active: true, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('*')
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ ok: true, data })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message || 'start failed' }, { status: 500 })
  }
}
