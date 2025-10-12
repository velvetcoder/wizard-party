'use client'

import { useEffect, useRef, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'

type DuelSession = {
  id: number
  active: boolean
  current_spell: string | null
  options: string[] | null
  updated_at: string | null
}

export default function DuelDisplay() {
  const supabase = useSupabaseBrowser()
  const [state, setState] = useState<DuelSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastUpdatedRef = useRef<string | null>(null)

  useEffect(() => {
    let stop = false
    async function tick() {
      const { data, error } = await supabase
        .from('duel_session')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (!stop) {
        if (error) setError(error.message)
        else setState((data as DuelSession) || null)
      }
      setTimeout(tick, 1000)
    }
    tick()
    return () => { stop = true }
  }, [supabase])

  const active = !!state?.active
  const opts = state?.options || []

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="text-center space-y-1">
        <h1 className="text-3xl font-semibold">Wizard Duel — Guess the Spell</h1>
        {!active && <p className="text-sm opacity-70">Waiting for the next turn…</p>}
      </header>

      {!active ? (
        <section className="rounded-2xl bg-white/10 p-6 text-center">
          <p className="opacity-80">The host will start a turn soon.</p>
        </section>
      ) : (
        <section className="rounded-2xl bg-white/10 p-5 space-y-4">
          <p className="text-sm opacity-80">Choose the spell (A–E):</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {opts.length === 0 ? (
              <div className="col-span-2 opacity-70">Dealing options…</div>
            ) : (
              opts.map((o, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-4 text-lg">
                  <span className="opacity-70 mr-2">{String.fromCharCode(65 + idx)}.</span>
                  <span className="font-imfell">{o}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-xs opacity-60">
            Actor: mime the spell. Caster + house: call out your answer!
          </p>
        </section>
      )}

      {error && (
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100">{error}</div>
      )}
    </div>
  )
}
