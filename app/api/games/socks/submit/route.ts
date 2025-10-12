import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const ALLOWED = ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin']

export async function POST(req: Request) {
  try {
    const s = createServerClient()
    const body = await req.json().catch(() => ({}))

    const display_name = String(body?.display_name || '').trim().slice(0, 80)
    const house = String(body?.house || '').trim()
    const guessNum = Number(body?.guess)

    if (!display_name) return NextResponse.json({ ok:false, error:'Missing name' }, { status:400 })
    if (!ALLOWED.includes(house)) return NextResponse.json({ ok:false, error:'Invalid house' }, { status:400 })
    if (!Number.isFinite(guessNum) || guessNum < 0) return NextResponse.json({ ok:false, error:'Invalid guess' }, { status:400 })

    // Upsert so players can correct their guess (latest wins)
    const { error } = await s
      .from('socks_guesses')
      .upsert(
        { display_name, house, guess: guessNum },
        { onConflict: 'display_name,house' }
      )

    if (error) throw error
    return NextResponse.json({ ok:true })
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e?.message ?? 'submit failed' }, { status:500 })
  }
}
