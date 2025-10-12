'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'

type Checkin = {
  id: number
  display_name: string
  house: string | null
  created_at: string
}

const ALLOWED_HOUSES = ['Gryffindor', 'Ravenclaw', 'Hufflepuff', 'Slytherin'] as const
type House = (typeof ALLOWED_HOUSES)[number]

export default function EnterPage() {
  const supabase = useSupabaseBrowser()
  const searchParams = useSearchParams()

  // Read ?house=&name= from URL once
  const initialHouse = useMemo(() => {
    const fromUrl = searchParams.get('house') || ''
    return (ALLOWED_HOUSES as readonly string[]).includes(fromUrl) ? (fromUrl as House) : ''
  }, [searchParams])

  const initialName = useMemo(() => searchParams.get('name') || '', [searchParams])

  // Form state
  const [displayName, setDisplayName] = useState<string>(initialName)
  const [house, setHouse] = useState<string>(initialHouse)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Arrivals count (polling)
  const [count, setCount] = useState<number>(0)
  useEffect(() => {
    let stop = false
    const refresh = async () => {
      const { count } = await supabase.from('checkins').select('*', { head: true, count: 'exact' })
      if (!stop) setCount(count || 0)
    }
    refresh()
    const id = setInterval(refresh, 5000)
    return () => { stop = true; clearInterval(id) }
  }, [supabase])

  // Optional: if no ?house= is present, try localStorage (from sorting page)
  useEffect(() => {
    if (!initialHouse) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('sortedHouse') : null
      if (saved && (ALLOWED_HOUSES as readonly string[]).includes(saved)) {
        setHouse(saved)
      }
    }
  }, [initialHouse])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim() || !house) {
      setMessage('Please enter your name and select a House.')
      return
    }
    try {
      setSubmitting(true)
      setMessage(null)
      const { error } = await supabase.from('checkins').insert([
        { display_name: displayName.trim(), house }
      ])
      if (error) throw error
      setMessage('✅ Checked in! Enjoy the party ✨')
      setDisplayName(prev => prev) // keep name
      // You could navigate elsewhere if you want:
      // window.location.href = '/sorting' or '/house'
    } catch (err: any) {
      setMessage(`❌ Check-in failed: ${err.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-medieval">Welcome — Check In</h1>
        <p className="opacity-80">Arrivals so far: <span className="font-semibold">{count}</span></p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white/10 p-4">
        <div>
          <label className="block text-sm mb-1">Your Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Hermione"
            className="w-full rounded-xl bg-white/10 p-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">House</label>
          <select
            value={house}
            onChange={(e) => setHouse(e.target.value)}
            className="w-full rounded-xl bg-white/10 p-2"
          >
            <option value="">Select your house…</option>
            {ALLOWED_HOUSES.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          {/* small hint if it was prefilled */}
          {initialHouse && <p className="text-xs opacity-70 mt-1">Prefilled from Sorting result.</p>}
        </div>

        <button
          type="submit"
          disabled={submitting || !displayName.trim() || !house}
          className="w-full rounded-xl bg-emerald-600 px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Checking in…' : 'I have arrived'}
        </button>

        {message && (
          <div className="text-sm opacity-90">{message}</div>
        )}
      </form>

      <div className="text-center">
        <a href="/sorting" className="text-sm underline opacity-80 hover:opacity-100">
          Haven’t been sorted yet? Take the Sorting Hat quiz →
        </a>
      </div>
    </div>
  )
}
