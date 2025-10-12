// app/games/award-points/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
import { toast } from 'sonner'

const HOUSES = ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'] as const
type House = typeof HOUSES[number]
type HouseRow = { house: string; points: number }
type LogRow = { id: string; house: string | null; delta: number; reason: string | null; created_at: string }

export default function AwardPointsPage() {
  const supabase = useSupabaseBrowser()
  const [totals, setTotals] = useState<HouseRow[]>([])
  const [recent, setRecent] = useState<LogRow[]>([])
  const [delta, setDelta] = useState<number>(5)
  const [reason, setReason] = useState<string>('Party award')
  const [name, setName] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchJSON<T>(url: string, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.ok) throw new Error(j?.error || `GET ${url} failed`)
    return j.data as T
  } finally {
    clearTimeout(id)
  }
}

async function loadTotals() {
  const data = await fetchJSON<HouseRow[]>('/api/points/totals')
  setTotals(data || [])
}

async function loadRecent() {
  const data = await fetchJSON<LogRow[]>('/api/points/recent')
  setRecent(data || [])
}


  useEffect(() => {
  let stop = false
  const pageHidden = () => typeof document !== 'undefined' && document.hidden

  async function tick(interval = 3000) {
    if (stop) return
    if (!pageHidden()) await Promise.all([loadTotals(), loadRecent()])
    setTimeout(() => tick(interval), interval)
  }

  tick()
  return () => { stop = true }
}, [])

  async function award(house: House, value: number) {
    try {
      setBusy(true); setError(null)
      const res = await fetch('/api/admin/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house,
          delta: value,
          reason: (reason || 'Party award') + (name ? ` — ${name}` : ''),
          display_name: name || ''
        })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Award failed')
      toast.success(`${value >= 0 ? '+' : ''}${value} to ${house}`)
      await Promise.all([loadTotals(), loadRecent()])
    } catch (e: any) {
      setError(e.message || 'Award failed')
      toast.error(e.message || 'Award failed')
    } finally {
      setBusy(false)
    }
  }
  

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Award Points</h1>
        <Link className="text-sm underline" href="/admin">← Back to Admin</Link>
      </div>

      {error && (
        <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Totals */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Current House Totals</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {totals.map(t => (
            <div key={t.house} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xs opacity-70">{t.house}</div>
              <div className="text-2xl font-semibold">{t.points}</div>
            </div>
          ))}
          {totals.length === 0 && (
            <div className="col-span-4 text-sm opacity-70">No totals yet.</div>
          )}
        </div>
      </section>

      {/* Controls */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Give / Take Points</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm opacity-80">Reason</label>
            <input
              value={reason}
              onChange={(e)=>setReason(e.target.value)}
              className="w-full rounded bg-white/10 px-3 py-2"
              placeholder="e.g., Best Costume"
            />
            <label className="text-sm opacity-80">Display name (optional)</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              className="w-full rounded bg-white/10 px-3 py-2"
              placeholder="e.g., Hermione #2"
            />
            <label className="text-sm opacity-80">Points (use minus to deduct)</label>
            <input
              type="number"
              value={delta}
              onChange={(e)=>setDelta(Number(e.target.value || 0))}
              className="w-36 rounded bg-white/10 px-3 py-2"
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="opacity-70">Quick:</span>
              {[5,10,20,-5,-10].map(v => (
                <button
                  key={v}
                  onClick={()=>setDelta(v)}
                  className={`rounded px-2 py-1 bg-white/10 hover:bg-white/20 ${delta===v ? 'ring-1 ring-white/40' : ''}`}
                >
                  {v > 0 ? `+${v}` : v}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm opacity-80">Award to House</div>
            <div className="flex flex-wrap gap-2">
              {HOUSES.map(h => (
                <button
                  key={h}
                  onClick={() => award(h, delta)}
                  disabled={busy}
                  className="rounded bg-white/10 px-3 py-2 hover:bg-white/20 disabled:opacity-50"
                >
                  {delta >= 0 ? `+${delta}` : delta} {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent awards log */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Recent Awards</h2>
        {recent.length === 0 ? (
          <p className="opacity-70 text-sm">No awards yet.</p>
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
