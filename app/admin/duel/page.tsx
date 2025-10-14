'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'

const HOUSES = ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'] as const
type House = typeof HOUSES[number]

type SessionState = {
  active: boolean
  current_spell: string | null // INCANTATION string
  options: string[] | null
  updated_at?: string
}

type HouseTotal = { house: string; points: number }
type LogRow = { id: string; house: string | null; delta: number; reason: string | null; created_at: string }

type BuzzRow = { id: string; display_name: string; house: string | null; created_at: string }
type Spell = { id?: number; name: string; incantation: string; description?: string | null; gesture?: string | null }

export default function DuelAdminPage() {
  const supabase = useSupabaseBrowser()

  const [session, setSession] = useState<SessionState | null>(null)
  const [totals, setTotals] = useState<HouseTotal[]>([])
  const [recent, setRecent] = useState<LogRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const [buzzes, setBuzzes] = useState<BuzzRow[]>([])
  const [actorHouse, setActorHouse] = useState<House | ''>('')

  // current spell details (looked up by incantation)
  const [spellDetail, setSpellDetail] = useState<Spell | null>(null)

  // ---------- Loaders ----------
  async function loadSession() {
    try {
      const res = await fetch('/api/duel/session?ts=' + Date.now(), { cache: 'no-store' })
      const j = await res.json()
      setSession(j?.data ?? null)
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
      const rows: LogRow[] = (j.data as LogRow[]) || []
      setRecent(rows.filter(r => (r.reason || '').toLowerCase().includes('wizard duel')))
    } catch (e: any) {
      setError(e.message || 'Failed to load recent awards')
    }
  }

  async function loadBuzzes() {
    // show last 30s in order received (oldest first)
    const sinceISO = new Date(Date.now() - 30_000).toISOString()
    const { data, error } = await supabase
      .from('duel_buzzes')
      .select('id, display_name, house, created_at')
      .eq('session_id', 1)
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true })
      .limit(20)
    if (!error) setBuzzes((data as BuzzRow[]) || [])
  }

  // Look up spell details by incantation from session
  async function loadSpellDetail(incantation: string) {
    const { data, error } = await supabase
      .from('wizard_spells')
      .select('id, name, incantation, description, gesture')
      .eq('incantation', incantation)
      .limit(1)
      .maybeSingle()
    if (!error) setSpellDetail((data as Spell) || null)
  }

  // ---------- Pollers ----------
  useEffect(() => {
    let alive = true
    const tick = async () => {
      if (!alive) return
      await Promise.all([loadSession(), loadTotals(), loadRecent(), loadBuzzes()])
      setTimeout(tick, 1500)
    }
    tick()
    return () => { alive = false }
  }, []) // mount

  // When session changes, fetch spell detail (if any)
  useEffect(() => {
    const inc = session?.current_spell || ''
    if (inc) loadSpellDetail(inc)
    else setSpellDetail(null)
  }, [session?.current_spell, supabase])

  // Remember actor house locally (so host doesn’t reselect)
  useEffect(() => {
    const saved = localStorage.getItem('duel_actor_house_admin') as House | '' | null
    if (saved && (HOUSES as readonly string[]).includes(saved)) setActorHouse(saved as House)
  }, [])
  useEffect(() => {
    if (actorHouse) localStorage.setItem('duel_actor_house_admin', actorHouse)
  }, [actorHouse])

  // ---------- Actions ----------
  async function resetDeck() {
    const res = await fetch('/api/duel/deck/reset', { method: 'POST' })
    const j = await res.json().catch(()=>({}))
    if (res.ok && j?.ok) toast.success('Deck reset & shuffled')
    else toast.error(j?.error || 'Reset failed')
  }

  async function award(house: House, delta: number, reason: string) {
    const res = await fetch('/api/admin/points/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house, delta, reason })
    })
    const j = await res.json().catch(()=>({}))
    if (!res.ok || !j?.ok) throw new Error(j?.error || 'Award failed')
  }

  async function awardByRule(b: BuzzRow) {
    if (!b.house || !(HOUSES as readonly string[]).includes(b.house)) {
      toast.error('Buzz has no House — cannot award automatically.')
      return
    }
    if (!actorHouse) {
      toast.error('Select the Actor’s House first.')
      return
    }
    const same = b.house === actorHouse
    const delta = same ? 2 : 1
    try {
      await award(b.house as House, delta, `Wizard Duel — ${b.display_name} guessed (${same ? 'same house' : 'other house'})`)
      toast.success(`+${delta} to ${b.house}`)
      await Promise.all([loadTotals(), loadRecent()])
    } catch (e:any) {
      toast.error(e?.message || 'Could not award points')
    }
  }

  const status = useMemo(() => session?.active ? 'ACTIVE' : 'INACTIVE', [session?.active])

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Wizard Duel — Admin Monitor</h1>
        <p className="text-sm opacity-80">Live state, spell detail, buzz queue, and current House totals.</p>
      </header>

      {error && (
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100 text-sm">
          {error}
        </div>
      )}

      {/* Session + Spell + Controls */}
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

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={resetDeck} className="rounded bg-white/10 px-3 py-2 hover:bg-white/20">
            Reset & Shuffle Deck
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80">Actor’s House</label>
            <select
              value={actorHouse}
              onChange={e=>setActorHouse(e.target.value as House)}
              className="rounded bg-white/10 px-3 py-2"
            >
              <option value="">Select…</option>
              {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        {session?.active ? (
          <>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
              <div className="text-xs opacity-70">Current Incantation</div>
              <div className="text-2xl font-imfell text-amber-300">
                {session.current_spell || '—'}
              </div>

              {spellDetail?.name && (
                <div className="opacity-90">
                  <span className="opacity-70">Spell: </span>{spellDetail.name}
                </div>
              )}
              {spellDetail?.description && (
                <div className="opacity-90">
                  <span className="opacity-70">What it does: </span>{spellDetail.description}
                </div>
              )}
            </div>

            {/* Buzz Queue */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Buzz Queue</div>
              {buzzes.length === 0 ? (
                <div className="opacity-70 text-sm">No buzzes yet.</div>
              ) : (
                <ul className="space-y-2">
                  {buzzes.map(b => (
                    <li key={b.id} className="rounded-xl bg-white/10 p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{b.display_name}</div>
                        <div className="text-xs opacity-70">
                          {b.house || '—'} • {new Date(b.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => awardByRule(b)}
                          className="rounded bg-emerald-600 px-3 py-1.5 hover:bg-emerald-700"
                        >
                          Award by Rule
                        </button>
                        {/* Manual overrides, if needed */}
                        {HOUSES.includes((b.house || '') as House) && (
                          <>
                            <button
                              onClick={() => award(b.house as House, 2, `Wizard Duel — manual +2 to ${b.house}`)}
                              className="rounded bg-white/10 px-3 py-1.5 hover:bg-white/20"
                            >
                              +2 {b.house}
                            </button>
                            <button
                              onClick={() => award(b.house as House, 1, `Wizard Duel — manual +1 to ${b.house}`)}
                              className="rounded bg-white/10 px-3 py-1.5 hover:bg-white/20"
                            >
                              +1 {b.house}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
        <p className="text-xs opacity-60">Totals include all Wizard Duel awards.</p>
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

