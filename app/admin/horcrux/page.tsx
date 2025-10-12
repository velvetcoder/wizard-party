// app/admin/horcrux/page.tsx
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'

type Step = { id:number; step_order:number; code:string; clue:string; hint?:string|null; name?:string|null }
type Prog = { display_name:string; house:string|null; step_order:number; completed_at:string }
type SessionRow = { id:number; active:boolean; updated_at:string }

export default function AdminHorcrux() {
  const supabase = useSupabaseBrowser()
  const [steps, setSteps] = useState<Step[]>([])
  const [rawProg, setRawProg] = useState<Prog[]>([])
  const [session, setSession] = useState<SessionRow|null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [showCodes, setShowCodes] = useState(false)
  const [showRules, setShowRules] = useState(false)

  async function loadSteps() {
    const { data, error } = await supabase
      .from('horcrux_steps')
      .select('id, step_order, code, clue, hint, name')
      .order('step_order', { ascending: true })
    if (error) setError(error.message)
    setSteps((data || []) as Step[])
  }

  async function loadProg() {
    const { data, error } = await supabase
      .from('horcrux_progress')
      .select('display_name, house, step_order, completed_at')
      .order('display_name', { ascending: true })
      .order('house', { ascending: true, nullsFirst: true })
      .order('step_order', { ascending: true })
      .order('completed_at', { ascending: true })
    if (error) setError(error.message)
    setRawProg((data || []) as Prog[])
  }

  async function loadSession() {
    const res = await fetch('/api/horcrux/session', { cache:'no-store' }).catch(() => null)
    const j = await res?.json().catch(() => null)
    setSession(j?.data ?? null)
  }

  useEffect(() => {
    loadSteps(); loadProg(); loadSession()
    const t = setInterval(() => { loadProg(); loadSession() }, 2000)
    return () => clearInterval(t)
  }, [])

  const latestByPlayer = useMemo(() => {
    const map = new Map<string, { display_name:string; house:string|null; max_step:number; last_at:string|null }>()
    for (const r of rawProg) {
      const key = `${r.display_name}||${r.house ?? ''}`
      const prev = map.get(key)
      const cand = { display_name:r.display_name, house:r.house, max_step:r.step_order, last_at:r.completed_at ?? null }
      if (!prev) map.set(key, cand)
      else if (cand.max_step > prev.max_step || (cand.max_step === prev.max_step && (cand.last_at ?? '') > (prev.last_at ?? ''))) {
        map.set(key, cand)
      }
    }
    return Array.from(map.values()).sort((a,b)=> b.max_step - a.max_step || ((b.last_at ?? '') > (a.last_at ?? '') ? 1 : -1))
  }, [rawProg])

  const houseBoard = useMemo(() => {
    const norm = (h?: string | null) => (h || '').trim().toLowerCase().replace(/\s+/g,'')
    const titleMap: Record<string,string> = {
      gryffindor:'Gryffindor',
      ravenclaw:'Ravenclaw',
      hufflepuff:'Hufflepuff',
      slytherin:'Slytherin',
    }
    const sums: Record<string, number> = { Gryffindor:0, Ravenclaw:0, Hufflepuff:0, Slytherin:0 }
    for (const p of latestByPlayer) {
      const key = titleMap[norm(p.house)]
      if (key) sums[key] += p.max_step
    }
    return (['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'] as const)
      .map(h => ({ house: h, score: sums[h] }))
      .sort((a,b) => b.score - a.score)
  }, [latestByPlayer])

  async function startGame() {
    setBusy(true); setError(null)
    const res = await fetch('/api/admin/horcrux/start', { method:'POST' })
    const j = await res.json().catch(()=>({}))
    if (!res.ok || !j?.ok) setError(j?.error || 'Start failed')
    await loadSession()
    setBusy(false)
  }
  async function stopGame() {
    setBusy(true); setError(null)
    const res = await fetch('/api/admin/horcrux/stop', { method:'POST' })
    const j = await res.json().catch(()=>({}))
    if (!res.ok || !j?.ok) setError(j?.error || 'Stop failed')
    await loadSession()
    setBusy(false)
  }
  async function resetProgress() {
    if (!confirm('Reset all progress?')) return
    setBusy(true); setError(null)
    const { error } = await supabase.from('horcrux_progress').delete().neq('step_order', -1)
    if (error) setError(error.message)
    await loadProg()
    setBusy(false)
  }

  const rulesText = `Horcrux Hunt — Host Script

• Find the Horcruxes in the correct order using the clues.
• If you stumble on a Horcrux out of order, you can't proceed; you must solve the previous clue first.
• Horcruxes are NOT under heavy items or near easily breakable things.
• All Horcruxes are inside the house on the first floor.
• The first three players/houses to finish will be awarded points.
• Random points may be awarded at any time (e.g., “for Outstanding Moral Fiber”). Good luck!`

  const copyRules = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rulesText)
    } catch {}
  }, [rulesText])

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Horcrux</h1>
        <Link className="underline text-sm" href="/admin">← Back to Admin</Link>
      </div>

      {error && <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100">{error}</div>}

      <section className="rounded-2xl bg-white/10 p-4 flex flex-wrap items-center gap-2">
        <div className="text-sm opacity-80 mr-auto">
          Status: {session?.active ? <span className="text-emerald-300">ACTIVE</span> : <span className="text-amber-300">INACTIVE</span>}
          {session?.updated_at && <span className="opacity-60"> • {new Date(session.updated_at).toLocaleTimeString()}</span>}
        </div>
        <button onClick={() => setShowRules(true)} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">
          Host Rules / Tips
        </button>
        <button onClick={startGame} disabled={busy || session?.active} className="rounded bg-emerald-600 px-3 py-1 hover:bg-emerald-700 disabled:opacity-50">Start Game</button>
        <button onClick={stopGame} disabled={busy || !session?.active} className="rounded bg-amber-600 px-3 py-1 hover:bg-amber-700 disabled:opacity-50">Stop Game</button>
        <button onClick={resetProgress} disabled={busy} className="rounded bg-rose-600 px-3 py-1 hover:bg-rose-700 disabled:opacity-50">Reset Progress</button>
      </section>

      {/* Steps */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Clues (order)</h2>
          <label className="text-sm flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCodes}
              onChange={e => setShowCodes(e.target.checked)}
            />
            Show secret codes
          </label>
        </div>
        <ul className="space-y-2">
          {steps.map(s => (
            <li key={s.id} className="rounded-xl bg-white/10 p-3 space-y-2">
              <div className="text-xs opacity-70">
                Step {s.step_order}{s.name ? ` — ${s.name}` : ''}
              </div>
              <div className="font-medium whitespace-pre-line">{s.clue}</div>

              {/* HINT goes here */}
              {s.hint && (
                <div className="text-sm italic text-amber-200 whitespace-pre-line">
                  Hint: {s.hint}
                </div>
              )}

              {/* CODE (optional toggle) */}
              {showCodes && (
                <div className="text-xs opacity-80">
                  Code: <code className="px-1 py-0.5 rounded bg-white/5">{s.code}</code>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>


      {/* Leaderboard */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Leaderboard (by House)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {houseBoard.map(h => (
            <div key={h.house} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xs opacity-70">{h.house}</div>
              <div className="text-2xl font-semibold">{h.score}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Progress by player */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Progress (by Player)</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {latestByPlayer.map((p,i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="font-medium">{p.display_name}</div>
              <div className="text-sm opacity-80">{p.house || '—'}</div>
              <div className="text-sm">Max Step: {p.max_step}</div>
              <div className="text-xs opacity-60">{p.last_at ? new Date(p.last_at).toLocaleTimeString() : ''}</div>
            </div>
          ))}
          {latestByPlayer.length === 0 && (
            <div className="opacity-70 text-sm">No progress yet.</div>
          )}
        </div>
      </section>

      {/* Host Rules Modal */}
      {showRules && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={e => { if (e.target === e.currentTarget) setShowRules(false) }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-[101] w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/10 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Host Rules / Tips</h3>
              <button onClick={() => setShowRules(false)} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Close</button>
            </div>
            <div className="text-sm whitespace-pre-line leading-relaxed">{rulesText}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={copyRules} className="rounded bg-white/10 px-3 py-2 hover:bg-white/20">Copy to clipboard</button>
              <button onClick={() => { setShowRules(false); startGame() }} className="rounded bg-emerald-600 px-3 py-2 hover:bg-emerald-700 disabled:opacity-50" disabled={!!session?.active}>Start Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
