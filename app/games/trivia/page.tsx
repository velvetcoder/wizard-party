'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
type Session = { id: number; active: boolean; active_question_id: number | null }
export default function TriviaPlayer() {
  const supabase = useSupabaseBrowser()
  const [displayName, setDisplayName] = useState('')
  const [house, setHouse] = useState('Gryffindor')
  const [session, setSession] = useState<Session | null>(null)
  const [locked, setLocked] = useState(false)
  const [justBuzzed, setJustBuzzed] = useState<string | null>(null)
  useEffect(() => {
  let stopped = false

  const fetchSession = async () => {
    const { data } = await supabase.from('trivia_sessions').select('*').limit(1)
    if (!stopped) setSession((data?.[0] as Session) || null)
  }

  fetchSession()
  const id = setInterval(fetchSession, 2000) // faster poll feels snappy for game play

  return () => { stopped = true; clearInterval(id) }
}, [supabase])

  const canBuzz = useMemo(() => !!displayName && session?.active && !locked, [displayName, session, locked])
  const buzz = async () => {
    if (!session?.id || !session?.active) return
    setLocked(true); setJustBuzzed('Buzz sent!')
    await supabase.from('trivia_buzzes').insert({ session_id: session.id, question_id: session.active_question_id, display_name: displayName, house })
    setTimeout(() => { setLocked(false); setJustBuzzed(null) }, 5000)
  }
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-2xl font-semibold">Trivia — Player</h1>
      <input className="w-full bg-white/10 rounded px-3 py-2" placeholder="Your name" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
      <select className="w-full bg-white/10 rounded px-3 py-2" value={house} onChange={e=>setHouse(e.target.value)}>
        {['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'].map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <button disabled={!canBuzz} onClick={buzz} className="w-full rounded-xl px-4 py-3 text-xl bg-white/10 hover:bg-white/20 disabled:opacity-40">✋ Buzz</button>
      {session?.active ? <p className="opacity-80 text-sm">Round is active. Fastest buzz wins!</p> : <p className="opacity-80 text-sm">Waiting for host to start…</p>}
      {justBuzzed && <p className="text-green-400">{justBuzzed}</p>}
    </div>
  )
}
