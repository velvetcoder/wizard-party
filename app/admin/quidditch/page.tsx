'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'

type LogRow = {
  id: string
  house: string | null
  delta: number
  reason: string | null
  created_at: string
}

const HOUSES = ['Gryffindor', 'Ravenclaw', 'Hufflepuff', 'Slytherin'] as const
type House = typeof HOUSES[number]

export default function QuidditchAdminPage() {
  const supabase = useSupabaseBrowser()

  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI filters/sort
  const [houseFilter, setHouseFilter] = useState<string>('') // '' = all
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'created_at' | 'house' | 'delta'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  async function load() {
    try {
      setLoading(true); setError(null)
      const { data, error } = await supabase
        .from('points_log')
        .select('id, house, delta, reason, created_at')
        .ilike('reason', 'Quidditch Pong%')
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      setRows((data || []) as LogRow[])
    } catch (e: any) {
      setError(e.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleSort(k: typeof sortKey) {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
  }

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (houseFilter && r.house !== houseFilter) return false
      if (!q) return true
      return (
        (r.house || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      )
    })
  }, [rows, houseFilter, search])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let x: number | string = a[sortKey] as any
      let y: number | string = b[sortKey] as any
      if (sortKey === 'created_at') {
        x = new Date(a.created_at).getTime()
        y = new Date(b.created_at).getTime()
      } else if (sortKey === 'house') {
        x = (a.house || '').toLowerCase()
        y = (b.house || '').toLowerCase()
      } else if (sortKey === 'delta') {
        x = a.delta; y = b.delta
      }
      if (x < y) return sortDir === 'asc' ? -1 : 1
      if (x > y) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortKey, sortDir])

  // Aggregates
  const stats = useMemo(() => {
    const byHouse: Record<House, { matches: number; points: number; snitch: number }> = {
      Gryffindor: { matches: 0, points: 0, snitch: 0 },
      Ravenclaw: { matches: 0, points: 0, snitch: 0 },
      Hufflepuff: { matches: 0, points: 0, snitch: 0 },
      Slytherin: { matches: 0, points: 0, snitch: 0 },
    }
    for (const r of rows) {
      const h = (r.house || '') as House
      if (!HOUSES.includes(h)) continue
      const isSnitch = (r.reason || '').toLowerCase().includes('snitch')
      // We assume +1 = win, +2 = snitch win (your player page awards that way)
      if (r.delta > 0) byHouse[h].matches += 1
      byHouse[h].points += r.delta || 0
      if (isSnitch) byHouse[h].snitch += 1
    }
    return byHouse
  }, [rows])

  // CSV
  function exportCSV() {
    const header = ['created_at', 'house', 'delta', 'reason']
    const lines = [header.join(',')]
    for (const r of sorted) {
      const line = [
        new Date(r.created_at).toISOString(),
        csvEscape(r.house || ''),
        String(r.delta ?? ''),
        csvEscape(r.reason || ''),
      ]
      lines.push(line.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quidditch_pong_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Quidditch Pong</h1>
        <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
      </div>

      {error && (
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100 text-sm">
          {error}
        </div>
      )}

      {/* House stats */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">House Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {HOUSES.map(h => (
            <div key={h} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xs opacity-70">{h}</div>
              <div className="text-sm mt-1">Matches: <span className="font-semibold">{stats[h].matches}</span></div>
              <div className="text-sm">Snitch: <span className="font-semibold">{stats[h].snitch}</span></div>
              <div className="text-sm">Points: <span className="font-semibold">{stats[h].points}</span></div>
            </div>
          ))}
        </div>
        <p className="text-xs opacity-60">Counts derive from <code>points_log</code> rows whose reason starts with “Quidditch Pong”.</p>
      </section>

      {/* Controls */}
      <section className="rounded-2xl bg-white/10 p-4 flex flex-wrap items-center gap-3">
        <select
          className="rounded bg-white/10 px-3 py-2"
          value={houseFilter}
          onChange={(e) => setHouseFilter(e.target.value)}
        >
          <option value="">All houses</option>
          {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <input
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          placeholder="Search reason/house…"
          className="rounded bg-white/10 px-3 py-2"
        />
        <button onClick={() => { setSearch(''); setHouseFilter(''); load() }}
                className="rounded bg-white/10 px-3 py-2 hover:bg-white/20">
          Clear / Refresh {loading ? '…' : ''}
        </button>
        <button onClick={exportCSV}
                className="rounded bg-white/10 px-3 py-2 hover:bg-white/20 ml-auto">
          Export CSV
        </button>
      </section>

      {/* Recent results table */}
      <section className="rounded-2xl bg-white/10 p-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-80">
            <tr>
              <Th label="When" active={sortKey==='created_at'} direction={sortDir} onClick={()=>toggleSort('created_at')} />
              <Th label="House" active={sortKey==='house'} direction={sortDir} onClick={()=>toggleSort('house')} />
              <Th label="Δ Points" active={sortKey==='delta'} direction={sortDir} onClick={()=>toggleSort('delta')} />
              <th className="py-2 pr-4">Reason</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</td>
                <td className="py-2 pr-4">{r.house || '—'}</td>
                <td className={`py-2 pr-4 font-medium ${r.delta > 0 ? 'text-emerald-300' : r.delta < 0 ? 'text-rose-300' : ''}`}>
                  {r.delta > 0 ? `+${r.delta}` : r.delta}
                </td>
                <td className="py-2 pr-4">{r.reason}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td className="py-3 opacity-70" colSpan={4}>No results yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function csvEscape(s: string) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function Th({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <th className="py-2 pr-4 cursor-pointer select-none" onClick={onClick}>
      {label}{' '}
      <span className="opacity-60">{active ? (direction === 'asc' ? '▲' : '▼') : ''}</span>
    </th>
  )
}
