'use client'

import { useEffect, useRef, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
import confetti from 'canvas-confetti'

type DuelSession = {
  id: number
  active: boolean
  current_spell: string | null
  options: string[] | null
  reveal?: boolean | null
  winner_house?: string | null
  updated_at: string | null
}

type Buzz = {
  id: string
  display_name: string | null
  house: string | null
  created_at: string
}

const HOUSE_COLORS: Record<string, string[]> = {
  Gryffindor: ['#740001', '#D3A625', '#EEBA30'], // dark red + golds
  Ravenclaw:  ['#0E1A40', '#946B2D', '#5D5D5D'], // blue + bronze
  Hufflepuff: ['#FFD800', '#000000', '#8B8B8B'], // yellow + black
  Slytherin:  ['#1A472A', '#2A623D', '#AAAAAA'], // green + silver
}

export default function DuelDisplay() {
  const supabase = useSupabaseBrowser()
  const [state, setState] = useState<DuelSession | null>(null)
  const [buzzes, setBuzzes] = useState<Buzz[]>([])
  const [error, setError] = useState<string | null>(null)
  const lastRevealFired = useRef<string>('') // guard against repeat confetti

  // initial load
  useEffect(() => {
    let stop = false
    ;(async () => {
      const { data: sData, error: sErr } = await supabase
        .from('duel_session')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (!stop) {
        if (sErr) setError(sErr.message)
        else setState((sData as DuelSession) || null)
      }

      const { data: bData, error: bErr } = await supabase
        .from('duel_buzzes')
        .select('id, display_name, house, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      if (!stop) {
        if (bErr) setError(bErr.message)
        else setBuzzes((bData as Buzz[]) || [])
      }
    })()
    return () => { stop = true }
  }, [supabase])

  // realtime subs
  useEffect(() => {
    const sessionCh = supabase
      .channel('duel_session_stream')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'duel_session', filter: 'id=eq.1' },
        (payload: any) => setState(payload.new as DuelSession)
      )
      .subscribe()

    const buzzCh = supabase
      .channel('duel_buzzes_stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duel_buzzes' },
        (payload: any) => {
          const row = payload.new as Buzz
          setBuzzes(prev => [row, ...prev].slice(0, 15))
        }
      )
      .subscribe()

    let pollId: any
    const poll = async () => {
      const [{ data: sData }, { data: bData }] = await Promise.all([
        supabase.from('duel_session').select('*').eq('id', 1).maybeSingle(),
        supabase.from('duel_buzzes').select('id, display_name, house, created_at').order('created_at', { ascending: false }).limit(15),
      ])
      if (sData) setState(sData as DuelSession)
      if (bData) setBuzzes(bData as Buzz[])
      pollId = setTimeout(poll, 10000)
    }
    poll()

    return () => {
      supabase.removeChannel(sessionCh)
      supabase.removeChannel(buzzCh)
      pollId && clearTimeout(pollId)
    }
  }, [supabase])

  // fire confetti when reveal toggles true (debounced by a key)
  useEffect(() => {
    if (!state?.reveal) return
    const key = `${state.updated_at}|${state.winner_house || ''}|${state.current_spell || ''}`
    if (lastRevealFired.current === key) return
    lastRevealFired.current = key

    const cols = HOUSE_COLORS[state.winner_house || ''] || ['#ffffff', '#cccccc']
    confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 }, colors: cols })
    setTimeout(() => confetti({ particleCount: 90, spread: 60, startVelocity: 45, origin: { y: 0.6 }, colors: cols }), 160)
  }, [state?.reveal, state?.winner_house, state?.current_spell, state?.updated_at])

  const active = !!state?.active
  const opts = state?.options || []
  const correct = state?.current_spell || ''
  const revealed = !!state?.reveal

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="text-center space-y-1">
        <h1 className="text-3xl font-semibold">Wizard Duel — Guess the Spell</h1>
        {!active && <p className="text-sm opacity-70">Waiting for the next turn…</p>}
      </header>

      {/* Options */}
      {!active ? (
        <section className="rounded-2xl bg-white/10 p-6 text-center">
          <p className="opacity-80">The host will start a turn soon.</p>
        </section>
      ) : (
        <section className="rounded-2xl bg-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm opacity-80">Choose the spell (A–E):</p>
            {revealed && state?.winner_house && (
              <div className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
                Winner: <b>{state.winner_house}</b>
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {opts.length === 0 ? (
              <div className="col-span-2 opacity-70">Dealing options…</div>
            ) : (
              opts.map((o, idx) => {
                const isCorrect = revealed && o === correct
                return (
                  <div
                    key={`${o}-${idx}`}
                    className={`rounded-xl border p-4 text-lg transition
                      ${isCorrect
                        ? 'bg-emerald-600/25 border-emerald-400/40 shadow-[0_0_0_2px_rgba(16,185,129,.4)_inset]'
                        : 'bg-white/5 border-white/10'}`}
                  >
                    <span className="opacity-70 mr-2">{String.fromCharCode(65 + idx)}.</span>
                    <span className={`font-imfell ${isCorrect ? 'text-emerald-200' : ''}`}>{o}</span>
                  </div>
                )
              })
            )}
          </div>
          <p className="text-xs opacity-60">
            Actor mimes the spell. Audience: buzz fast and shout your answer!
          </p>
        </section>
      )}

      {/* Live Buzzes */}
      <section className="rounded-2xl bg-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live Buzzes</h2>
          {state?.updated_at && (
            <div className="text-xs opacity-60">Last update {new Date(state.updated_at).toLocaleTimeString()}</div>
          )}
        </div>
        {buzzes.length === 0 ? (
          <p className="opacity-70 text-sm">No buzzes yet…</p>
        ) : (
          <ul className="space-y-2">
            {buzzes.map(b => (
              <li key={b.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{b.display_name || 'Player'}</div>
                  <div className="text-xs opacity-70">{new Date(b.created_at).toLocaleTimeString()}</div>
                </div>
                <div className="text-xs opacity-80">{b.house || '—'}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100">{error}</div>
      )}
    </div>
  )
}
