'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
import { toast } from 'sonner'

const HOUSES = ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'] as const
type House = typeof HOUSES[number]

type SessionState = {
  active: boolean
  current_spell: string | null
  options: string[] | null
  updated_at?: string
}

type BuzzRow = { id: string; display_name: string; house: string | null; created_at: string }

export default function AudienceDuelPage() {
  const supabase = useSupabaseBrowser()

  // Identity (remember locally so they don’t retype)
  const [name, setName] = useState('')
  const [house, setHouse] = useState<House | ''>('')

  // Session state
  const [session, setSession] = useState<SessionState | null>(null)
  const active = !!session?.active

  // UX flags
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0) // seconds
  const [recent, setRecent] = useState<BuzzRow[]>([])

  // Load saved identity
  useEffect(() => {
    setName(localStorage.getItem('duel_audience_name') || '')
    setHouse((localStorage.getItem('duel_audience_house') as House) || '')
  }, [])
  useEffect(() => { localStorage.setItem('duel_audience_name', name) }, [name])
  useEffect(() => { if (house) localStorage.setItem('duel_audience_house', house) }, [house])

  // Poll the duel session (active/inactive + current spell)
  async function loadSession() {
    try {
      const res = await fetch('/api/duel/session?ts=' + Date.now(), { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      setSession(j?.data ?? null)
    } catch (_) {}
  }
  useEffect(() => {
    let alive = true
    const tick = async () => {
      if (!alive) return
      await loadSession()
      setTimeout(tick, 2000)
    }
    tick()
    return () => { alive = false }
  }, [])

  // Tiny cooldown timer so users don’t hammer
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // Show a small “recent buzzes” list (optional but reassuring)
  async function loadRecentBuzzes() {
    const sinceISO = new Date(Date.now() - 60_000).toISOString() // last 60s
    const { data } = await supabase
      .from('duel_buzzes')
      .select('id, display_name, house, created_at')
      .eq('session_id', 1)
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: false })
      .limit(10)
    setRecent((data as BuzzRow[]) || [])
  }
  useEffect(() => {
    let stop = false
    const tick = async () => {
      if (stop) return
      await loadRecentBuzzes()
      setTimeout(tick, 2000)
    }
    tick()
    return () => { stop = true }
  }, [supabase])

  // Buzz action
  async function buzz() {
    if (!active) {
      toast.error('Round is not active yet.')
      return
    }
    if (!name.trim() || !house) {
      toast.error('Enter your name and choose your House first.')
      return
    }
    if (cooldown > 0) {
      toast.message('Please wait a moment…')
      return
    }

    try {
      setBusy(true)
      const { error } = await supabase.from('duel_buzzes').insert([{
        display_name: name.trim(),
        house,
        session_id: 1,
      }])
      if (error) throw error
      toast.success('Buzzed! The actor will see you.')
      setCooldown(5) // short client cooldown; server also has 2s anti-spam
      await loadRecentBuzzes()
      // haptic nudge on mobile if available
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        // @ts-ignore
        navigator.vibrate?.(40)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not buzz')
    } finally {
      setBusy(false)
    }
  }

  const ready = useMemo(() => !!name.trim() && !!house, [name, house])

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Wizard Duel — Audience</h1>
        <p className="text-sm opacity-80">
          When the round is <b className="text-emerald-300">ACTIVE</b>, hit the big button to buzz in and guess the spell.
        </p>
      </header>

      {/* Identity */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm opacity-80">Your name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Luna"
              className="w-full rounded bg-white/10 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm opacity-80">House</label>
            <select
              value={house}
              onChange={e => setHouse(e.target.value as House)}
              className="w-full rounded bg-white/10 px-3 py-2"
            >
              <option value="">Select house…</option>
              {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs opacity-60">We’ll remember this on your device for the night.</p>
      </section>

      {/* Status + Buzz */}
      <section className="rounded-2xl bg-white/10 p-5 space-y-4 text-center">
        <div className="text-sm opacity-80">
          Status:{' '}
          {active ? (
            <span className="text-emerald-300 font-medium">ACTIVE</span>
          ) : (
            <span className="text-amber-300 font-medium">INACTIVE</span>
          )}
          {session?.updated_at && (
            <span className="opacity-60"> • {new Date(session.updated_at).toLocaleTimeString()}</span>
          )}
        </div>

        <button
          onClick={buzz}
          disabled={!ready || !active || busy || cooldown > 0}
          className={`w-full rounded-2xl px-6 py-4 text-lg font-semibold transition
            ${(!ready || !active || busy || cooldown>0)
              ? 'bg-white/10 opacity-60 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {cooldown > 0 ? `Wait… ${cooldown}s` : (active ? 'BUZZ!' : 'Waiting for round…')}
        </button>

        {!active && (
          <p className="text-xs opacity-60">
            You’ll be able to buzz when the actor starts the round.
          </p>
        )}
      </section>

      {/* Recent buzzes (reassurance) */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-2">
        <div className="text-sm font-medium">Recent Buzzes (last minute)</div>
        {recent.length === 0 ? (
          <div className="opacity-70 text-sm">No buzzes yet.</div>
        ) : (
          <ul className="space-y-1">
            {recent.map(r => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="opacity-90">{r.display_name}</span>
                <span className="opacity-70">{r.house || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs opacity-60 text-center">
        Be loud and clear with your guess! The actor awards points: +2 if you’re in the same House, +1 otherwise.
      </p>
    </div>
  )
}
