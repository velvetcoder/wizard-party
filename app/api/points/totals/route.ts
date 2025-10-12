import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'   // ⬅ ensure no static caching
export const revalidate = 0              // ⬅ extra belt

export async function GET() {
  try {
    const s = createServerClient()
    const { data, error } = await s
      .from('house_points')
      .select('*')
      .order('house', { ascending: true })
    if (error) throw error

    return NextResponse.json(
      { ok: true, data },
      { headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'totals failed' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' }
      }
    )
  }
}
