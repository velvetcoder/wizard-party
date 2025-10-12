'use client'

import { useEffect, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'

type Question = {
  id: number
  category: string | null
  question: string
  answer: string
  difficulty?: number | null
}
type Session = { id: number; active: boolean; active_question_id: number | null }
type Buzz = {
  id: number
  display_name: string
  house: string | null
  created_at: string
  question_id: number | null
  session_id: number | null
}

const HOUSES = ['Gryffindor', 'Ravenclaw', 'Hufflepuff', 'Slytherin'] as const
type House = typeof HOUSES[number]

export default function AdminTrivia() {
  const supabase = useSupabaseBrowser()

  const [questions, setQuestions] = useState<Question[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [buzzes, setBuzzes] = useState<Buzz[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [awardBusy, setAwardBusy] = useState(false)
  const [customDelta, setCustomDelta] = useState<number>(5)

  // Load questions (minimal fields for speed)
  async function loadQuestions() {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('trivia_questions')
        .select('id, category, question, answer')
        .order('id', { ascending: true })
      if (error) throw error
      setQuestions((data as Question[]) || [])
    } catch (e: any) {
      setQuestions([])
      setError(e.message || 'Failed to load questions')
    }
  }

  // Load current session (single row)
  async function loadSession() {
    try {
      const { data, error } = await supabase
        .from('trivia_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      const s = (data as Session) || null
      setActiveId(s?.active_question_id ?? null)
    } catch (e: any) {
      setError(e.message || 'Failed to load session')
      setActiveId(null)
    }
  }

  // On mount: stop any lingering round, then load
  useEffect(() => {
    ;(async () => {
      try {
        await fetch('/api/admin/trivia/stop', { method: 'POST' }).catch(() => {})
      } finally {
        await Promise.all([loadQuestions(), loadSession()])
      }
    })()
  }, []) // mount once

  // Light polling for active question
  useEffect(() => {
    let timer: any
    async function tick() {
      await loadSession()
      timer = setTimeout(tick, 2000)
    }
    tick()
    return () => clearTimeout(timer)
  }, [])

  // Poll buzzes for the active question
  useEffect(() => {
    let stop = false
    async function fetchBuzzes() {
      if (!activeId) {
        if (!stop) setBuzzes([])
        return
      }
      const { data, error } = await supabase
        .from('trivia_buzzes')
        .select('*')
        .eq('question_id', activeId)
        .order('created_at', { ascending: true })
        .limit(20)
      if (!stop) {
        if (error) setError(error.message)
        setBuzzes((data as Buzz[]) || [])
      }
    }
    fetchBuzzes()
    const id = setInterval(fetchBuzzes, 800)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [supabase, activeId])

  // Actions
  const seed = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/trivia/seed', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Seed failed')
      await loadQuestions()
    } catch (e: any) {
      setError(e.message || 'Seed failed')
    } finally {
      setLoading(false)
    }
  }

  const start = async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/trivia/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Start failed')
      setActiveId(id) // optimistic
      await loadSession() // confirm
    } catch (e: any) {
      setError(e.message || 'Start failed')
    } finally {
      setLoading(false)
    }
  }

  const stop = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/trivia/stop', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Stop failed')
      setActiveId(null)
      setBuzzes([])
      await loadSession()
    } catch (e: any) {
      setError(e.message || 'Stop failed')
    } finally {
      setLoading(false)
    }
  }

  // ---- Award helpers ----
  async function award(house: House, delta: number, reason?: string, displayName?: string) {
    try {
      setAwardBusy(true)
      setError(null)
      const res = await fetch('/api/admin/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house,
          delta,
          reason: reason || `Trivia correct answer${displayName ? ` — ${displayName}` : ''}`,
          display_name: displayName || '',
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Award failed')
    } catch (e: any) {
      setError(e.message || 'Award failed')
    } finally {
      setAwardBusy(false)
    }
  }

  // Convenience: award to first buzzer's house (if available); else choose manually
  const first = buzzes[0]
  const firstHouse = (first?.house && HOUSES.includes(first.house as House)) ? (first.house as House) : null

  const firstQuestionId = questions[0]?.id ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Admin — Trivia Control</h1>
        <div className="text-sm opacity-80">
          {activeId ? (
            <>Round: <span className="text-green-400 font-medium">ACTIVE</span> (Q#{activeId})</>
          ) : (
            <>Round: inactive</>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={seed}
          disabled={loading}
          className="rounded bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50"
        >
          Seed Sample Questions
        </button>
        <button
          onClick={stop}
          disabled={loading}
          className="rounded bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50"
        >
          Stop Round
        </button>
        <button
          onClick={() => firstQuestionId && start(firstQuestionId)}
          disabled={loading || !firstQuestionId}
          className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Starting…' : 'Quick Start (first question)'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Questions</h2>
        <ul className="space-y-2">
          {questions.map((q) => (
            <li key={q.id} className="rounded-xl p-3 bg-white/10">
              <div className="text-xs opacity-70">{q.category || 'General'} • Q#{q.id}</div>
              <div className="font-medium">{q.question}</div>
              <div className="opacity-70 text-sm">Answer: {q.answer}</div>
              <button
                onClick={() => start(q.id)}
                disabled={loading}
                className="mt-2 rounded bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-50"
              >
                Start with this question {activeId === q.id ? '(active)' : ''}
              </button>
            </li>
          ))}
          {questions.length === 0 && (
            <li className="rounded-xl p-3 bg-white/10">No questions yet. Click “Seed Sample Questions”.</li>
          )}
        </ul>
      </section>

      {/* ---- Buzz Monitor + Award ---- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Buzz Monitor</h2>
        {!activeId ? (
          <p className="opacity-70">No active round.</p>
        ) : buzzes.length === 0 ? (
          <p className="opacity-70">Waiting for the first buzz…</p>
        ) : (
          <>
            <ul className="space-y-2">
              {buzzes.map((b, i) => (
                <li
                  key={b.id}
                  className={`rounded-xl p-3 border ${
                    i === 0 ? 'bg-emerald-600/20 border-emerald-400/40' : 'bg-white/10 border-white/10'
                  }`}
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

            {/* Award controls */}
            <div className="rounded-2xl bg-white/10 p-3 space-y-3">
              <div className="text-sm opacity-80">Award points</div>

              {firstHouse ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      award(firstHouse, 5, 'Trivia correct answer', first?.display_name || undefined)
                    }
                    disabled={awardBusy}
                    className="rounded bg-emerald-600 px-3 py-1 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    +5 to {firstHouse}
                  </button>
                  <button
                    onClick={() =>
                      award(firstHouse, 10, 'Trivia correct answer', first?.display_name || undefined)
                    }
                    disabled={awardBusy}
                    className="rounded bg-emerald-600 px-3 py-1 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    +10 to {firstHouse}
                  </button>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customDelta}
                      onChange={(e) => setCustomDelta(Number(e.target.value || 0))}
                      className="w-20 rounded bg-white/10 px-2 py-1"
                    />
                    <button
                      onClick={() =>
                        award(firstHouse, customDelta, 'Trivia custom award', first?.display_name || undefined)
                      }
                      disabled={awardBusy}
                      className="rounded bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-50"
                    >
                      +{customDelta} to {firstHouse}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm opacity-80">First buzzer has no house — use quick house buttons below.</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {HOUSES.map((h) => (
                  <button
                    key={h}
                    onClick={() => award(h, 5, 'Trivia correct answer')}
                    disabled={awardBusy}
                    className="rounded bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-50"
                  >
                    +5 {h}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <p className="opacity-70 text-sm">
        Put <code>/games/trivia/display</code> on a big screen. Players use <code>/games/trivia</code> to buzz.
      </p>
    </div>
  )
}
