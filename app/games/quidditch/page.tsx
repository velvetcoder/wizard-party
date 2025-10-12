// app/games/quidditch/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

const HOUSES = ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'] as const
type House = typeof HOUSES[number]

export default function QuidditchPong() {
  const [house, setHouse] = useState<House | ''>('')
  const [winnerName, setWinnerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function award(delta: 1 | 2) {
    try {
      setBusy(true); setError(null)
      if (!house) { setError('Pick a house.'); return }
      const reason =
        delta === 2
          ? `Quidditch Pong — Golden Snitch win${winnerName ? ` — ${winnerName}` : ''}`
          : `Quidditch Pong — Match win${winnerName ? ` — ${winnerName}` : ''}`

      const res = await fetch('/api/admin/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house,
          delta,
          reason,
          display_name: winnerName || ''
        })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Failed to award points')
      toast.success(`${delta > 0 ? '+' : ''}${delta} to ${house}`)
      // optional: clear name after award
      setWinnerName('')
    } catch (e: any) {
      setError(e.message || 'Failed to award points')
      toast.error(e.message || 'Failed to award points')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quidditch Pong</h1>
        <Link href="/games" className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">
          ← Back to Games Hub
        </Link>
      </div>

      <p className="opacity-80">
        A magical twist on classic beer pong! Gather your cups, ping pong balls,
        and plenty of house pride.
      </p>

      {/* Setup */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Setup</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Arrange 10 cups in a pyramid at each end of the table (your “goal hoops”).</li>
          <li>Fill cups partially with water. Also make sure you have a personal drink of your own in hand.</li>
          <li>Divide into two teams — each representing a Hogwarts house.</li>
        </ul>
      </section>

      {/* Rules */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Rules</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Teams or individuals alternate tossing a ping pong ball into the opposing cups.</li>
          <li>If a ball lands in a cup, the opponents drink from their personal drink and remove that cup.</li>
          <li>Clear all opponent cups to win the match.</li>
          <li>“Golden Snitch Cup”: place one special cup aside — sink it to instantly win.</li>
        </ul>
      </section>

      {/* Tips */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Tips</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Chants and cheers encouraged — show your House spirit!</li>
          <li>Use colored cups or labels for Houses.</li>
          <li>Keep it friendly and safe — drink responsibly if using alcohol.</li>
        </ul>
      </section>

      {/* Award Points */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-3">
        <h2 className="text-xl font-semibold">Award House Points</h2>
        <p className="text-sm opacity-75">
          Log match results right here. Regular win = +1 point. Golden Snitch win = +2 points.
        </p>

        {error && (
          <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm opacity-80">Winning House</label>
            <select
              value={house}
              onChange={(e)=>setHouse(e.target.value as House)}
              className="w-full rounded bg-white/10 px-3 py-2"
            >
              <option value="">Select house…</option>
              {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm opacity-80">Winner (optional)</label>
            <input
              value={winnerName}
              onChange={(e)=>setWinnerName(e.target.value)}
              placeholder="e.g., Harry & Ron"
              className="w-full rounded bg-white/10 px-3 py-2"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={()=>award(1)}
            disabled={busy || !house}
            className="rounded bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50"
          >
            +1 Regular Win
          </button>
          <button
            onClick={()=>award(2)}
            disabled={busy || !house}
            className="rounded bg-amber-600 px-4 py-2 hover:bg-amber-700 disabled:opacity-50"
          >
            +2 Snitch Win
          </button>
        </div>
      </section>
    </div>
  )
}
