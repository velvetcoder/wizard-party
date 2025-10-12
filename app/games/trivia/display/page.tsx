// app/games/trivia/display/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

type Session = { id: number; active: boolean; active_question_id: number | null; updated_at?: string }
type Question = { id: number; category: string | null; question: string; answer: string }
type Buzz = { id: number; display_name: string; house: string | null; created_at: string; question_id: number | null; session_id: number | null }

const SESSION_POLL_MS = 600
const BUZZ_POLL_MS = 600
const AWARD_POLL_MS = 900
const MIN_GAP_MS = 400 // ignore awards that happen within 0.4s of each other



export default function TriviaDisplay() {
  const supabase = useSupabaseBrowser()
  const supabaseRef = useRef(supabase)
  supabaseRef.current = supabase

  const [session, setSession] = useState<Session | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [buzzes, setBuzzes] = useState<Buzz[]>([])
  const [error, setError] = useState<string | null>(null)

  const lastQidRef = useRef<number | null>(null)
  const activeQidRef = useRef<number | null>(null)
  const sessionActiveRef = useRef<boolean>(false)
  sessionActiveRef.current = !!session?.active
  activeQidRef.current = session?.active && session.active_question_id ? session.active_question_id : null

  const sessionUpdatedAtRef = useRef<string | null>(null)
  sessionUpdatedAtRef.current = session?.updated_at ?? null

  const lastAwardIdRef = useRef<string | null>(null)   // points_log.id is uuid
  const awardPrimedRef = useRef(false)                 // prevents instant replay on mount
  const lastAwardAtRef = useRef<number>(0)             

  const pageHidden = () => typeof document !== 'undefined' && document.hidden

  // House-colored confetti
  function boomConfettiFor(house?: string | null) {
  const colorsByHouse: Record<string, string[]> = {
    Gryffindor: ['#ae0001', '#eeba30'],
    Ravenclaw: ['#0e1a40', '#946b2d'],
    Hufflepuff: ['#ecb939', '#372e29'],
    Slytherin: ['#1a472a', '#aaaaaa'],
  }
  const colors = (house && colorsByHouse[house]) || undefined

  // burst from CENTER, keep it under the toast
  confetti({
    particleCount: 90,
    spread: 65,
    origin: { x: 0.5, y: 0.5 },
    colors,
    ticks: 120,
    zIndex: 1000,                 // lower than toast z-index
    disableForReducedMotion: true
  })

  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 55,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.5 },
      colors,
      ticks: 100,
      zIndex: 1000,
      disableForReducedMotion: true
    })
  }, 140)
}


  // --- Session poll
  useEffect(() => {
    let stop = false
    let timer: any

    async function tick() {
      if (stop || pageHidden()) { schedule(); return }
      try {
        const { data, error } = await supabaseRef.current
          .from('trivia_sessions')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)

        if (error) { setError(error.message) }
        const s = (data?.[0] as Session) || null
        setSession(s)

        const curQid = s?.active_question_id ?? null
        if (curQid !== lastQidRef.current) {
          lastQidRef.current = curQid
          if (curQid) {
            const { data: qd, error: qerr } = await supabaseRef.current
              .from('trivia_questions')
              .select('*')
              .eq('id', curQid)
              .single()
            if (qerr) setError(qerr.message)
            setQuestion((qd as Question) || null)
          } else {
            setQuestion(null)
          }
        }
      } finally {
        schedule()
      }
    }

    function schedule() { timer = setTimeout(tick, SESSION_POLL_MS) }

    tick()
    return () => { stop = true; clearTimeout(timer) }
  }, [])

  // --- Buzz poll
  useEffect(() => {
    let stop = false
    let timer: any

    async function pollBuzzes() {
      if (stop || pageHidden()) { schedule(); return }
      const qid = activeQidRef.current
      if (!qid) { setBuzzes([]); schedule(); return }

      const { data, error } = await supabaseRef.current
        .from('trivia_buzzes')
        .select('*')
        .eq('question_id', qid)
        .order('created_at', { ascending: true })
        .limit(30)

      if (error) setError(error.message)
      setBuzzes((data as Buzz[]) || [])
      schedule()
    }

    function schedule() { timer = setTimeout(pollBuzzes, BUZZ_POLL_MS) }

    pollBuzzes()
    return () => { stop = true; clearTimeout(timer) }
  }, [])

  // --- Celebrate awards (watch latest points_log row safely)
  useEffect(() => {
    let stop = false
    let timer: any

    async function tick() {
      if (stop || (typeof document !== 'undefined' && document.hidden)) { schedule(); return }
      if (!sessionActiveRef.current) { schedule(); return }

      const { data, error } = await supabaseRef.current
        .from('points_log')
        .select('id, house, delta, reason, created_at')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!error) {
        const row = data?.[0] as
          | { id: string; house: string | null; delta: number; reason: string; created_at: string }
          | undefined

        // Prime on first read so we don't replay the last round's award
        if (!awardPrimedRef.current) {
          if (row) lastAwardIdRef.current = row.id
          awardPrimedRef.current = true
          schedule()
          return
        }

        if (row && row.id !== lastAwardIdRef.current) {
          const sessionStartedAt = sessionUpdatedAtRef.current
          const isAfterSessionStart =
            !sessionStartedAt || new Date(row.created_at).getTime() >= new Date(sessionStartedAt).getTime()

          if (isAfterSessionStart) {
            // Debounce back-to-back awards
            const now = Date.now()
            if (now - lastAwardAtRef.current < MIN_GAP_MS) {
              lastAwardIdRef.current = row.id
              schedule()
              return
            }
            lastAwardAtRef.current = now

            lastAwardIdRef.current = row.id
            const house = row.house || 'House'
            const delta = row.delta ?? 0
            toast.success(`+${delta} to ${house}!`, { description: row.reason || 'Points awarded' })
            boomConfettiFor(house)
          } else {
            lastAwardIdRef.current = row.id
          }
        }
      }

      schedule()
    }

    function schedule() { timer = setTimeout(tick, AWARD_POLL_MS) }

    tick()
    return () => { stop = true; clearTimeout(timer) }
  }, [])

  if (!session?.active) {
    ;(confetti as any)?.reset?.()     
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
        <h1 className="text-3xl font-bold">Trivia is not active</h1>
        <p className="opacity-70 mt-1">Waiting for the next round to begin…</p>
        {error && <p className="text-red-300 text-sm mt-2">Error: {error}</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl min-h-screen p-6 space-y-6">
      <header className="text-center space-y-1">
        <h1 className="text-3xl font-medieval">Trivia — Host Display</h1>
        {error && <p className="text-red-300 text-sm">Error: {error}</p>}
      </header>

      <section className="rounded-2xl bg-white/10 p-5">
        <div className="text-xs opacity-70 mb-2">
          {question?.category || 'General'} • Q#{question?.id ?? '—'}
        </div>
        <h2 className="text-2xl font-imfell">
          {question?.question || 'Loading question…'}
        </h2>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">Buzzes</h3>
        {buzzes.length === 0 ? (
          <p className="opacity-70">Waiting for the first buzz…</p>
        ) : (
          <ul className="space-y-2">
            {buzzes.map((b, i) => (
              <li
                key={b.id}
                className={`rounded-xl p-3 border ${i === 0 ? 'bg-emerald-600/20 border-emerald-400/40' : 'bg-white/10 border-white/10'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{b.display_name}</span>
                  <span className="opacity-70 text-sm">{b.house || ''}</span>
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(b.created_at).toLocaleTimeString()}
                  {i === 0 && <span className="ml-2 text-emerald-300">🟢 First buzz</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
