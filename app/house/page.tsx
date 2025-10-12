'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'

type Row = { house: string; points: number }

export default function HousesPage() {
  const supabase = useSupabaseBrowser()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data, error } = await supabase
      .from('house_points')
      .select('*')
    if (error) {
      setError(error.message)
    } else {
      setRows((data || []) as Row[])
    }
    setLoading(false)
  }

  // initial + polling
  useEffect(() => {
    let stop = false
    load()
    const id = setInterval(() => !stop && load(), 5000)
    return () => { stop = true; clearInterval(id) }
  }, [])

  // sorted view
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.points - a.points),
    [rows]
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-4xl font-medieval text-center">House Points</h1>
        <p className="text-center opacity-70 mt-2">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-4xl font-medieval text-center">House Points</h1>
        <p className="text-center text-red-300 mt-2">Error: {error}</p>
      </div>
    )
  }

  const empty = sorted.length === 0

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <header className="text-center">
        <h1 className="text-4xl font-medieval">House Points</h1>
        <p className="opacity-80">Live totals (updates every few seconds)</p>
      </header>

      <ul className="space-y-3">
        {(empty ? ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'].map(h => ({ house: h, points: 0 })) : sorted)
          .map(({ house, points }) => (
          <li key={house} className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
            <span className="font-imfell text-3xl">{house}</span>
            <span className="text-2xl font-bold">{points}</span>
          </li>
        ))}
      </ul>

      {empty && (
        <p className="text-center text-sm opacity-70">
          No rows in <code>house_points</code> yet. Seed them in SQL or via your admin tools.
        </p>
      )}
    </div>
  )
}
