// app/games/horcrux/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

type Step = {
  id: number
  step_order: number
  code: string
  clue: string
  name?: string | null
  hint?: string | null
}

type Progress = {
  display_name: string
  house: string | null
  step_order: number
  completed_at: string
}

type SessionRow = { id: number; active: boolean; updated_at: string }

const HOUSES = ['Gryffindor', 'Ravenclaw', 'Hufflepuff', 'Slytherin'] as const
type House = (typeof HOUSES)[number]

// ---------- Confetti helpers (house-colored) ----------
function boomConfettiFor(house?: string | null, big = false) {
  const colorsByHouse: Record<string, string[]> = {
    Gryffindor: ['#ae0001', '#eeba30'],
    Ravenclaw: ['#0e1a40', '#946b2d'],
    Hufflepuff: ['#ecb939', '#372e29'],
    Slytherin: ['#1a472a', '#aaaaaa'],
  }
  const colors = (house && colorsByHouse[house]) || undefined

  const common = { origin: { y: 0.6 }, colors }
  if (big) {
    confetti({ ...common, particleCount: 160, spread: 75, startVelocity: 55 })
    setTimeout(() => confetti({ ...common, particleCount: 120, spread: 70 }), 160)
  } else {
    confetti({ ...common, particleCount: 90, spread: 60 })
    setTimeout(() => confetti({ ...common, particleCount: 60, spread: 55, startVelocity: 45 }), 140)
  }
}

export default function HorcruxGame() {
  const supabase = useSupabaseBrowser()

  // Identity
  const [displayName, setDisplayName] = useState('')
  const [house, setHouse] = useState('')

  // Data
  const [steps, setSteps] = useState<Step[]>([])
  const [myProg, setMyProg] = useState<Progress[]>([])
  const [session, setSession] = useState<SessionRow | null>(null)

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Hint handling (~2.5m after a clue becomes visible)
  const [showHint, setShowHint] = useState(false)
  const hintTimerRef = useRef<any>(null)
  const startHintTimer = () => {
    clearTimeout(hintTimerRef.current)
    setShowHint(false)
    hintTimerRef.current = setTimeout(() => setShowHint(true), 150_000)
  }
  useEffect(() => () => clearTimeout(hintTimerRef.current), [])

  // Avoid duplicate end-game celebration
  const didCelebrateRef = useRef(false)

  // ---------- Identity persistence ----------
  useEffect(() => {
    setDisplayName(localStorage.getItem('hp_player_name') || '')
    setHouse(localStorage.getItem('hp_player_house') || '')
  }, [])
  useEffect(() => {
    if (displayName) localStorage.setItem('hp_player_name', displayName)
  }, [displayName])
  useEffect(() => {
    if (house) localStorage.setItem('hp_player_house', house)
  }, [house])

  // ---------- Poll session ----------
  useEffect(() => {
    let stop = false
    async function tick() {
      const res = await fetch(`/api/horcrux/session?ts=${Date.now()}`, { cache: 'no-store' }).catch(() => null)
      const j = await res?.json().catch(() => null)
      if (!stop) setSession(j?.data ?? null)
      setTimeout(tick, 2000)
    }
    tick()
    return () => {
      stop = true
    }
  }, [])

  // ---------- Load steps once ----------
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('horcrux_steps')
        .select('id, step_order, code, clue, name, hint')
        .order('step_order', { ascending: true })
      if (error) setError(error.message)
      setSteps((data || []) as Step[])
    })()
  }, [supabase])

  // ---------- Load my progress (poll while named) ----------
  useEffect(() => {
    if (!displayName) return
    let stop = false
    async function tick() {
      if (!stop) await refreshProgress(displayName, house)
      setTimeout(tick, 2000)
    }
    tick()
    return () => {
      stop = true
    }
  }, [displayName, house])

  // Helper to load my progress (handles NULL house correctly)
  async function refreshProgress(name: string, h: string) {
    let q = supabase
      .from('horcrux_progress')
      .select('display_name, house, step_order, completed_at')
      .eq('display_name', name)
      .order('step_order', { ascending: true })

    // IMPORTANT: .eq('house', null) never matches; use .is
    // @ts-ignore - supabase client supports .is at runtime
    q = h ? q.eq('house', h) : q.is('house', null)

    const { data, error } = await q
    if (error) {
      setError(error.message)
      setMyProg([])
      return
    }
    setMyProg((data || []) as Progress[])
  }

  // ---------- Compute what's visible ----------
  const maxDone = useMemo(() => (myProg.length ? Math.max(...myProg.map(p => p.step_order)) : 0), [myProg])

  const visibleClue = useMemo(() => {
    if (!steps.length) return null
    const next = (maxDone || 0) + 1
    return steps.find(s => s.step_order === next) || null
  }, [steps, maxDone])

  const gameActive = !!session?.active

  // Restart hint timer when the visible clue changes (while active)
  useEffect(() => {
    if (!gameActive || !visibleClue) return
    startHintTimer()
    return () => clearTimeout(hintTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameActive, visibleClue?.step_order])

  // Fetch current max from DB right before we accept a code (prevents racing)
  async function getCurrentMax(name: string, h: string) {
    let q = supabase.from('horcrux_progress').select('step_order').eq('display_name', name)
    // @ts-ignore
    q = h ? q.eq('house', h) : q.is('house', null)
    const { data } = await q
    return (data || []).reduce((m: number, r: any) => Math.max(m, r.step_order ?? 0), 0)
  }

  // ---------- Submit code ----------
  async function submitCode(code: string) {
    setError(null)
    setInfo(null)

    const c = (code || '').toUpperCase().trim()
    if (!c) {
      setError('Enter the code.')
      return
    }
    if (!displayName) {
      setError('Please enter your name.')
      return
    }
    if (!house) {
      setError('Please choose your house.')
      return
    }
    if (!session?.active) {
      setError('Game not started yet.')
      return
    }

    // Re-check latest progress from DB
    const currentMax = await getCurrentMax(displayName, house)

    const step = steps.find(s => s.code.toUpperCase() === c)
    if (!step) {
      setError('Unknown code. Try again.')
      return
    }

    const expected = (currentMax || 0) + 1
    if (step.step_order !== expected) {
      setError(expected > 1 ? `Not yet! You must complete Step ${expected - 1} first.` : 'Start at Step 1.')
      return
    }

    // Write to DB
    const { error: insErr } = await supabase.from('horcrux_progress').insert([
      {
        display_name: displayName,
        house: house || null,
        step_order: step.step_order,
      },
    ])
    if (insErr) {
      setError(insErr.message)
      return
    }

    // Optimistic advance for instant feedback
    setMyProg(prev => {
      const already = prev.some(p => p.step_order === step.step_order)
      if (already) return prev
      const now = new Date().toISOString()
      return [
        ...prev,
        { display_name: displayName, house: house || null, step_order: step.step_order, completed_at: now } as any,
      ]
    })

    // Friendly message with Horcrux name
    const label = step.name || `Step ${step.step_order}`
    setInfo(`You found the Horcrux: ${label}`)

    // Small celebration each find
    boomConfettiFor(house as House)

    // Clear input
    const el = document.getElementById('answer-input') as HTMLInputElement | null
    if (el) el.value = ''

    // If last step, big celebration (+ toast)
    const maxStepAll = steps.length ? Math.max(...steps.map(s => s.step_order)) : 0
    if (step.step_order === maxStepAll && !didCelebrateRef.current) {
      didCelebrateRef.current = true
      toast.success('All Horcruxes destroyed! 🎉', { description: 'You found every Horcrux!' })
      boomConfettiFor(house as House, true)
    }

    // Sync soon after (for multi-device consistency)
    setTimeout(() => refreshProgress(displayName, house), 400)
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-5">
      <h1 className="text-2xl font-medieval">Horcrux Hunt</h1>

      {/* Identity */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-sm opacity-80">Player name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g., Rachael"
              className="w-full rounded bg-white/10 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm opacity-80">House</label>
            <select
              value={house}
              onChange={e => setHouse(e.target.value)}
              className="w-full rounded bg-white/10 px-3 py-2"
            >
              <option value="">Select house…</option>
              {HOUSES.map(h => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs opacity-70">Individuals compete, but housemates may team up.</p>
      </section>

      {/* Status & feedback */}
      {error && (
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-100">
          {info}
        </div>
      )}

      {/* Clue area */}
      {!gameActive ? (
        <section className="rounded-2xl bg-white/10 p-4">
          <p className="opacity-80">Game not started yet — check back soon.</p>
        </section>
      ) : visibleClue ? (
        <section className="rounded-2xl bg-white/10 p-4 space-y-3">
          <div className="text-sm opacity-80">Clue {visibleClue.step_order}</div>
          <div className="whitespace-pre-line text-lg font-imfell">{visibleClue.clue}</div>

          <div className="pt-2 space-y-2">
            <label className="text-sm opacity-80">Enter the secret code</label>
            <div className="flex gap-2">
              <input
                id="answer-input"
                placeholder="Code…"
                className="flex-1 rounded bg-white/10 px-3 py-2 uppercase"
              />
              <button
                className="rounded bg-white/10 px-3 py-2 hover:bg-white/20"
                onClick={() => {
                  const el = document.getElementById('answer-input') as HTMLInputElement | null
                  submitCode(el?.value || '')
                }}
              >
                Submit
              </button>
            </div>
          </div>

          {/* Hint after ~2.5 minutes */}
          <div className="pt-2">
            {showHint ? (
              <div className="text-sm opacity-90">
                Hint: {visibleClue.hint || 'Think location + object details.'}
              </div>
            ) : (
              <div className="text-xs opacity-60">A hint will appear here after a few minutes…</div>
            )}
          </div>
        </section>
      ) : (
        // All done state (also handled with a toast + big confetti)
        <section className="rounded-2xl bg-emerald-600/15 p-6 text-center space-y-3">
          <h2 className="text-2xl font-imfell text-emerald-200">🎉 Congratulations! 🎉</h2>
          <p className="opacity-90">You’ve found all the Horcruxes and defeated Voldemort!</p>
        </section>
      )}
    </div>
  )
}
