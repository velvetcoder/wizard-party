'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type SessionState = {
  active: boolean
  current_spell: string | null
  options: string[] | null
  updated_at?: string
}

type HouseTotal = { house: string; points: number }
type LogRow = { id: string; house: string | null; delta: number; reason: string | null; created_at: string }

export default function DuelAdminPage() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [totals, setTotals] = useState<HouseTotal[]>([])
  const [recent, setRecent] = useState<LogRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function loadSession() {
  try {
    const res = await fetch('/api/duel/session?ts=' + Date.now(), { cache: 'no-store' })
    const j = await res.json()
    setSession(j?.data ?? null) // <— use data
  } catch (e:any) {
    console.error(e)
  }
}


  async function loadTotals() {
    try {
      const res = await fetch('/api/points/totals?ts=' + Date.now(), { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Failed to load totals')
      setTotals((j.data as HouseTotal[]) || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load totals')
    }
  }

  async function loadRecent() {
    try {
      const res = await fetch('/api/points/recent?ts=' + Date.now(), { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Failed to load recent awards')
      // Show only Wizard Duel-related awards (client-side filter)
      const rows: LogRow[] = (j.data as LogRow[]) || []
      setRecent(rows.filter(r => (r.reason || '').toLowerCase().includes('wizard duel')))
    } catch (e: any) {
      setError(e.message || 'Failed to load recent awards')
    }
  }

  // Poll session + scores every 2s
  useEffect(() => {
    let alive = true
    const tick = async () => {
      if (!alive) return
      await Promise.all([loadSession(), loadTotals(), loadRecent()])
      setTimeout(tick, 2000)
    }
    tick()
    return () => { alive = false }
  }, [])

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Wizard Duel — Admin Monitor</h1>
        <p className="text-sm opacity-80">Live state of the duel round, options, and current House scores.</p>
      </header>

      {error && (
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100 text-sm">
          {error}
        </div>
      )}

      {/* Session status & options */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-80">
            Status:{' '}
            {session?.active ? (
              <span className="text-emerald-300 font-medium">ACTIVE</span>
            ) : (
              <span className="text-amber-300 font-medium">INACTIVE</span>
            )}
          </div>
          {session?.updated_at && (
            <div className="text-xs opacity-60">Updated {new Date(session.updated_at).toLocaleTimeString()}</div>
          )}
        </div>
        <button
            onClick={async () => {
                const res = await fetch('/api/duel/deck/reset', { method: 'POST' })
                const j = await res.json().catch(()=>({}))
                if (res.ok && j?.ok) toast.success('Deck reset & shuffled')
                else toast.error(j?.error || 'Reset failed')
            }}
            className="rounded bg-white/10 px-3 py-2 hover:bg-white/20"
            >
            Reset & Shuffle Deck
        </button>


        {session?.active ? (
          <>
            <div className="space-y-1">
              <div className="text-xs opacity-70">Current Spell</div>
              <div className="text-xl font-semibold">{session.current_spell || '—'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs opacity-70">Multiple-Choice Options</div>
              <ul className="list-disc list-inside space-y-1">
                {session.options?.map(opt => <li key={opt}>{opt}</li>) || <li className="opacity-60">None</li>}
              </ul>
            </div>
          </>
        ) : (
          <div className="opacity-70 text-sm">Game is inactive — no current spell.</div>
        )}
      </section>

      {/* Current house totals */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Current House Totals</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {totals.map(t => (
            <div key={t.house} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xs opacity-70">{t.house}</div>
              <div className="text-2xl font-semibold">{t.points}</div>
            </div>
          ))}
          {totals.length === 0 && <div className="col-span-4 text-sm opacity-70">No totals yet.</div>}
        </div>
        <p className="text-xs opacity-60">Scores are total House points (including Wizard Duel awards).</p>
      </section>

      {/* Recent Wizard Duel awards */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Recent Wizard Duel Awards</h2>
        {recent.length === 0 ? (
          <p className="opacity-70 text-sm">No recent duel awards.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map(r => (
              <li key={r.id} className="rounded-xl bg-white/10 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">{r.house || 'House'}</span>{' '}
                    <span className={r.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {r.delta >= 0 ? `+${r.delta}` : r.delta}
                    </span>
                  </div>
                  <div className="text-xs opacity-70">{new Date(r.created_at).toLocaleTimeString()}</div>
                </div>
                {r.reason && <div className="text-xs opacity-80 mt-1">{r.reason}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
