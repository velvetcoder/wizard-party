'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'

type GuessRow = {
  id: number
  display_name: string
  house: string | null
  guess: number
  created_at: string
  updated_at: string
}

type SortKey = 'created_at' | 'display_name' | 'house' | 'guess'
type SortDir = 'asc' | 'desc'

export default function SocksAdminPage() {
  const supabase = useSupabaseBrowser()
  const [rows, setRows] = useState<GuessRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('') // name/house filter
  const [actualCount, setActualCount] = useState<number | ''>('')

  async function load() {
    try {
      setLoading(true); setError(null)
      const { data, error } = await supabase
        .from('socks_guesses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      setRows((data || []) as GuessRow[])
    } catch (e: any) {
      setError(e.message || 'Failed to load guesses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000) // auto-refresh every 5s
    return () => clearInterval(id)
  }, []) // eslint-disable-line

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      (r.display_name || '').toLowerCase().includes(q) ||
      (r.house || '').toLowerCase().includes(q)
    )
  }, [rows, filter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let x: any = a[sortKey]
      let y: any = b[sortKey]
      if (sortKey === 'created_at') {
        x = new Date(x).getTime(); y = new Date(y).getTime()
      } else if (sortKey === 'guess') {
        x = Number(x); y = Number(y)
      } else {
        x = (x || '').toString().toLowerCase()
        y = (y || '').toString().toLowerCase()
      }
      if (x < y) return sortDir === 'asc' ? -1 : 1
      if (x > y) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const ranked = useMemo(() => {
    const n = typeof actualCount === 'number' ? actualCount : null
    if (n == null) return []
    const withDiff = sorted.map(r => ({
      ...r,
      diff: Math.abs(r.guess - n),
      overUnder: r.guess === n ? 'exact' : r.guess > n ? 'over' : 'under',
    }))
    withDiff.sort((a, b) => a.diff - b.diff || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return withDiff
  }, [sorted, actualCount])

  function exportCSV() {
    const header = ['display_name','house','guess','created_at']
    const lines = [header.join(',')]
    for (const r of sorted) {
      const row = [
        csvEscape(r.display_name),
        csvEscape(r.house || ''),
        String(r.guess),
        new Date(r.created_at).toISOString()
      ]
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dobby_socks_guesses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Dobby Socks</h1>
        <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
      </div>

      {error && (
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100 text-sm">
          {error}
        </div>
      )}

      {/* Controls */}
      <section className="rounded-2xl bg-white/10 p-4 flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e)=>setFilter(e.target.value)}
          placeholder="Filter by name or house…"
          className="rounded bg-white/10 px-3 py-2"
        />
        <button
          onClick={() => { setFilter(''); load() }}
          className="rounded bg-white/10 px-3 py-2 hover:bg-white/20"
        >
          Clear / Refresh
        </button>
        <button
          onClick={exportCSV}
          className="rounded bg-white/10 px-3 py-2 hover:bg-white/20"
        >
          Export CSV
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm opacity-80">Actual Count:</label>
          <input
            type="number"
            min={0}
            value={actualCount}
            onChange={(e)=>setActualCount(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-24 rounded bg-white/10 px-2 py-1"
          />
        </div>
      </section>

      {/* Winners preview (local calc) */}
      {typeof actualCount === 'number' && (
        <section className="rounded-2xl bg-emerald-600/10 border border-emerald-500/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Closest Guesses</h2>
            <div className="text-sm opacity-80">Target: {actualCount}</div>
          </div>
          {ranked.length === 0 ? (
            <div className="opacity-70 text-sm">No guesses yet.</div>
          ) : (
            <ol className="list-decimal pl-6 space-y-1">
              {ranked.slice(0, 5).map((r, i) => (
                <li key={r.id}>
                  <span className="font-medium">{r.display_name}</span> — {r.house || '—'} — guess {r.guess} (±{r.diff}, {r.overUnder})
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs opacity-60">This ranking is computed locally for preview; award points however you like.</p>
        </section>
      )}

      {/* Table */}
      <section className="rounded-2xl bg-white/10 p-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-80">
            <tr>
              <Th label="Submitted" active={sortKey==='created_at'} dir={sortDir} onClick={()=>toggleSort('created_at')} />
              <Th label="Name" active={sortKey==='display_name'} dir={sortDir} onClick={()=>toggleSort('display_name')} />
              <Th label="House" active={sortKey==='house'} dir={sortDir} onClick={()=>toggleSort('house')} />
              <Th label="Guess" active={sortKey==='guess'} dir={sortDir} onClick={()=>toggleSort('guess')} />
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</td>
                <td className="py-2 pr-4">{r.display_name}</td>
                <td className="py-2 pr-4">{r.house || '—'}</td>
                <td className="py-2 pr-4 font-medium">{r.guess}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td className="py-3 opacity-70" colSpan={4}>No guesses yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <p className="text-xs opacity-60">
        Tip: If a player needs to adjust their guess, submitting again with the same name & house will overwrite their previous guess.
      </p>
    </div>
  )
}

function csvEscape(s: string) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function Th({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <th className="py-2 pr-4 cursor-pointer select-none" onClick={onClick}>
      {label}{' '}
      <span className="opacity-60">{active ? (dir === 'asc' ? '▲' : '▼') : ''}</span>
    </th>
  )
}
