'use client'
import { useEffect, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
import { useSearchParams, useParams } from 'next/navigation'
type Step = { id:number; step_order:number; code:string; clue:string }
export default function HorcruxStepPage() {
  const supabase = useSupabaseBrowser()
  const params = useParams()
  const code = params?.code as string
  const search = useSearchParams()
  const [displayName, setDisplayName] = useState(search.get('name') || '')
  const [house, setHouse] = useState(search.get('house') || 'Gryffindor')
  const [step, setStep] = useState<Step | null>(null)
  const [nextHint, setNextHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('horcrux_steps').select('*').eq('code', code).single()
      if (error || !data) { setError('Invalid horcrux code.'); return }
      setStep(data as Step)
    }
    load()
  }, [code, supabase])

  const confirmStep = async () => {
    if (!step) return
    await supabase.from('horcrux_progress').insert({ display_name: displayName || 'Guest', house, step_order: step.step_order })
    const { data: next } = await supabase.from('horcrux_steps').select('*').eq('step_order', step.step_order + 1).maybeSingle()
    if (next) setNextHint(next.clue)
    else setNextHint('You found them all! Report to the Great Hall to claim your points!')
  }

  if (error) return <p className="text-red-300">{error}</p>
  if (!step) return <p className="opacity-80">Loading…</p>

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold">Horcrux Step {step.step_order}</h1>
      <p className="rounded-xl p-4 bg-white/10">{step.clue}</p>
      <div className="grid gap-2">
        <input className="bg-white/10 rounded px-3 py-2" placeholder="Your name" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
        <select className="bg-white/10 rounded px-3 py-2" value={house} onChange={e=>setHouse(e.target.value)}>
          {['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'].map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <button onClick={confirmStep} className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20">I Found This Horcrux</button>
      </div>
      {nextHint && (
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/30">
          <div className="font-semibold">Next Hint</div>
          <div>{nextHint}</div>
        </div>
      )}
    </div>
  )
}
