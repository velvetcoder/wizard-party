import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const s = createServerClient()
    const { data, error } = await s
      .from('points_log')
      .select('id, house, delta, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) throw error

    return NextResponse.json(
      { ok: true, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'recent failed' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' }
      }
    )
  }
}
