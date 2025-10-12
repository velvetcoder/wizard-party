'use client'
import { useEffect, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
import Link from 'next/link'
type Checkin = { id:number; display_name:string; house:string|null; created_at:string }
export default function AdminCheckins() {
  const supabase = useSupabaseBrowser()
  const [items, setItems] = useState<Checkin[]>([])
  const [byHouse, setByHouse] = useState<Record<string, number>>({ Gryffindor:0, Ravenclaw:0, Hufflepuff:0, Slytherin:0 })
  const load = async () => {
    const { data } = await supabase.from('checkins').select('*').order('created_at', { ascending: false })
    const list = (data as Checkin[]) || []; setItems(list)
    const agg: Record<string, number> = { Gryffindor:0, Ravenclaw:0, Hufflepuff:0, Slytherin:0 }
    list.forEach(c => { if (c.house) agg[c.house] = (agg[c.house] || 0) + 1 }); setByHouse(agg)
  }
  useEffect(() => {
  let stopped = false

  const load = async () => {
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .order('created_at', { ascending: false })

    const list = (data as Checkin[]) || []
    if (!stopped) {
      setItems(list)
      const agg: Record<string, number> = { Gryffindor:0, Ravenclaw:0, Hufflepuff:0, Slytherin:0 }
      list.forEach(c => { if (c.house) agg[c.house] = (agg[c.house] || 0) + 1 })
      setByHouse(agg)
    }
  }

  // Initial + poll every 5s
  load()
  const id = setInterval(load, 5000)

  return () => { stopped = true; clearInterval(id) }
}, [supabase])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Arrivals</h1>
        <Link className="underline opacity-80 hover:opacity-100" href="/admin">Back</Link>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(byHouse).map(([h, n]) => (
          <div key={h} className="rounded-xl p-4 bg-white/10">
            <div className="text-sm opacity-70">{h}</div>
            <div className="text-2xl font-bold">{n}</div>
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Latest Check-ins</h2>
        <ul className="space-y-2">
          {items.map(i => (
            <li key={i.id} className="rounded-xl p-3 bg-white/10 flex items-center justify-between">
              <span className="font-medium">{i.display_name}</span>
              <span className="opacity-70 text-sm">{i.house}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
