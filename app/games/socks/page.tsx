'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

const HOUSES = ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'] as const
type House = typeof HOUSES[number]

export default function DobbySocks() {
  const [name, setName] = useState('')
  const [house, setHouse] = useState<House | ''>('')
  const [guess, setGuess] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // remember identity between games
  useEffect(() => {
    setName(localStorage.getItem('hp_player_name') || '')
    setHouse((localStorage.getItem('hp_player_house') as House) || '')
  }, [])
  useEffect(() => { if (name)  localStorage.setItem('hp_player_name', name) }, [name])
  useEffect(() => { if (house) localStorage.setItem('hp_player_house', house) }, [house])

  async function submit() {
    try {
      setBusy(true); setError(null)
      if (!name.trim()) throw new Error('Please enter your name.')
      if (!house) throw new Error('Please select your house.')
      const val = Number(guess)
      if (!Number.isFinite(val) || val < 0) throw new Error('Enter a valid non-negative number.')

      const res = await fetch('/api/games/socks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name.trim(), house, guess: val })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Submission failed.')

      toast.success('Guess submitted!')
    } catch (e: any) {
      setError(e.message || 'Submission failed.')
      toast.error(e.message || 'Submission failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dobby Socks</h1>
        <Link href="/games" className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">
          ← Back to Games Hub
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How to Play</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Dobby is sitting on a jar filled with socks 🧦.</li>
          <li>Your task: <strong>guess how many socks</strong> are in the jar.</li>
          <li>The <strong>closest</strong> guess wins House points.</li>
          <li>Enter your name, pick your House, and submit your single best guess.</li>
        </ul>
      </section>

      {error && (
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-100 text-sm">
          {error}
        </div>
      )}

      <section className="rounded-2xl bg-white/10 p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm opacity-80">Your name</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="e.g., Luna"
              className="w-full rounded bg-white/10 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm opacity-80">House</label>
            <select
              value={house}
              onChange={(e)=>setHouse(e.target.value as House)}
              className="w-full rounded bg-white/10 px-3 py-2"
            >
              <option value="">Select house…</option>
              {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm opacity-80">Your guess (number of socks)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={guess}
            onChange={(e)=>setGuess(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g., 137"
            className="w-40 rounded bg-white/10 px-3 py-2"
          />
        </div>

        <button
          onClick={submit}
          disabled={busy}
          className="rounded bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50"
        >
          Submit Guess
        </button>
      </section>

      <p className="text-xs opacity-60">
        Note: Final scoring is determined by the host when the true count is revealed.
      </p>
    </div>
  )
}
