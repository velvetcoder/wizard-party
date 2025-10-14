'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSupabaseBrowser } from '@/lib/supabase/useClient'
import { toast } from 'sonner'

type Spell = {
  id?: number
  name: string
  incantation: string
  description?: string | null
  gesture?: string | null
}

type Buzz = {
  id: string
  display_name: string
  house: string | null
  session_id: number | null
  created_at: string
}

const HOUSES = ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'] as const
type House = typeof HOUSES[number]

const FALLBACK_SPELLS: Spell[] = [
  { name: 'Disarming Charm',  incantation: 'Expelliarmus',        description: 'Knocks the opponent’s wand away.', gesture: 'Your wand flies from your hand.' },
  { name: 'Stunning Spell',   incantation: 'Stupefy',             description: 'Briefly incapacitates target.',     gesture: 'Freeze and stumble backward.' },
  { name: 'Shield Charm',     incantation: 'Protego',             description: 'Blocks incoming magic.',            gesture: 'Throw up a shimmering shield.' },
  { name: 'Body-Bind Curse',  incantation: 'Petrificus Totalus',  description: 'Locks body stiff like a board.',    gesture: 'Arms snap to sides; go rigid.' },
  { name: 'Tickling Charm',   incantation: 'Rictusempra',         description: 'Causes uncontrollable laughter.',   gesture: 'Burst into giggles, squirming.' },
  { name: 'Dancing Feet',     incantation: 'Tarantallegra',       description: 'Forces feet to dance wildly.',      gesture: 'Tap feet in silly, fast steps.' },
  { name: 'Memory Charm',     incantation: 'Obliviate',           description: 'Erases/warps memories (theatrical).', gesture: 'Look confused; “lose your place”.' },
  { name: 'Wand-Lighting',    incantation: 'Lumos',               description: 'Lights wand tip.',                  gesture: 'Hold wand like a flashlight.' },
  { name: 'Extinguish Light', incantation: 'Nox',                 description: 'Extinguishes wand light.',          gesture: 'Pinch out the “light”.' },
  { name: 'Levitation',       incantation: 'Wingardium Leviosa',  description: 'Makes objects float.',              gesture: 'Guide an object gently upward.' },
]

export default function DuelActorPage() {
  const supabase = useSupabaseBrowser()

  // Actor identity (the one performing)
  const [actorName, setActorName] = useState('')
  const [actorHouse, setActorHouse] = useState<House | ''>('')

  // Spells
  const [spells, setSpells] = useState<Spell[]>([])
  const [currentSpell, setCurrentSpell] = useState<Spell | null>(null)
  const [currentOptions, setCurrentOptions] = useState<string[]>([]) // <-- keep latest MCQ options

  // Timer
  const [seconds, setSeconds] = useState(45)
  const [timeLeft, setTimeLeft] = useState(45)
  const [turnActive, setTurnActive] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Buzzes
  const [buzzes, setBuzzes] = useState<Buzz[]>([])
  const [busy, setBusy] = useState(false)

  // Load spells (DB first, then fallback)
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('wizard_spells') // id, name, incantation, description, gesture
        .select('id, name, incantation, description, gesture')
        .order('name', { ascending: true })
        .limit(200)

      if (!error && data && data.length > 0) setSpells(data as Spell[])
      else setSpells(FALLBACK_SPELLS)
    })()
  }, [supabase])

  // Persist actor & timer settings
  useEffect(() => {
    setActorName(localStorage.getItem('duel_actor_name') || '')
    setActorHouse((localStorage.getItem('duel_actor_house') as House) || '')
    const savedSecs = Number(localStorage.getItem('duel_seconds') || '120')
    if (Number.isFinite(savedSecs) && savedSecs > 0) {
      setSeconds(savedSecs)
      setTimeLeft(savedSecs)
    }
  }, [])
  useEffect(() => { localStorage.setItem('duel_actor_name', actorName) }, [actorName])
  useEffect(() => { if (actorHouse) localStorage.setItem('duel_actor_house', actorHouse) }, [actorHouse])
  useEffect(() => { localStorage.setItem('duel_seconds', String(seconds)) }, [seconds])

  // Timer mechanics
  useEffect(() => {
    if (!turnActive) return
    if (timeLeft <= 0) {
      endTurn(false)
      return
    }
    timerRef.current && clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => { timerRef.current && clearTimeout(timerRef.current) }
  }, [turnActive, timeLeft])

  // Reset & shuffle deck at the very first start (optional)
  async function resetDeckAtStart() {
    await fetch('/api/duel/deck/reset', { method: 'POST' }).catch(()=>{})
  }

  // Publish round state for Display/Admin
  async function publishRound(spellIncantation: string | null, options: string[] | null, active: boolean, extra?: Partial<{reveal:boolean;winner_house:string|null}>) {
    await fetch('/api/duel/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active,
        current_spell: spellIncantation,
        options,
        reveal: extra?.reveal ?? false,
        winner_house: extra?.winner_house ?? null,
      }),
    }).catch(()=>{})
  }

  async function dealSpell() {
    // draw next from server
    const res = await fetch('/api/duel/deck/draw', { method: 'POST' })
    const j = await res.json().catch(()=>({}))
    if (!res.ok || !j?.ok) {
      toast.error(j?.error || 'Could not draw spell')
      return
    }
    if (!j.spell) {
      toast.info('Deck exhausted — no more spells!')
      setCurrentSpell(null)
      setCurrentOptions([])
      await publishRound(null, null, false, { reveal: false, winner_house: null })
      return
    }

    const pick = j.spell as Spell
    setCurrentSpell(pick)

    // Build decoy options (incantations)
    const bank = (spells.length ? spells : FALLBACK_SPELLS)
      .map(s => s.incantation)
      .filter(Boolean) as string[]
    const correct = pick.incantation
    const pool = bank.filter(n => n !== correct)
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[k]] = [pool[k], pool[i]]
    }
    const options = [...pool.slice(0,4), correct].sort(() => Math.random() - 0.5)

    // remember options for reveal later
    setCurrentOptions(options)

    // publish new round (not revealed)
    await publishRound(correct, options, true, { reveal: false, winner_house: null })
  }

  function startTurn() {
    if (!actorName || !actorHouse) {
      toast.error('Enter your name and house first.')
      return
    }
    setTurnActive(true)
    setTimeLeft(seconds)
    resetDeckAtStart()
    dealSpell()
  }

  function endTurn(showToast = true) {
    setTurnActive(false)
    setCurrentSpell(null)
    setCurrentOptions([])
    setTimeLeft(seconds)
    publishRound(null, null, false, { reveal: false, winner_house: null })
    if (showToast) toast.message('Turn ended.')
  }

  // Buzz polling (session_id = 1; last 2 minutes)
useEffect(() => {
  let alive = true
  async function tick() {
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('duel_buzzes')
      .select('id, display_name, house, session_id, created_at')
      .eq('session_id', 1)
      .gte('created_at', since)
      .order('created_at', { ascending: true }) // ✅ oldest first (earliest buzz on top)
      .limit(100)
    if (!alive) return
    if (!error) setBuzzes((data as Buzz[]) || [])
    setTimeout(tick, 1000)
  }
  tick()
  return () => { alive = false }
}, [supabase])



  // Points
  async function awardPoints(house: House, delta: number, reason: string) {
    const res = await fetch('/api/admin/points/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house, delta, reason }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.ok) throw new Error(j?.error || 'Award failed')
  }

  // When awarding, also REVEAL the answer + set winner so Display can highlight & confetti
  async function awardForBuzz(b: Buzz, delta: number) {
    if (!b.house || !HOUSES.includes(b.house as House)) {
      toast.error('Buzz has no valid house.')
      return
    }
    try {
      setBusy(true)
      await awardPoints(
        b.house as House,
        delta,
        `Wizard Duel — ${b.display_name} guessed "${currentSpell?.incantation}"`
      )

      // Reveal on display with winner house
      await publishRound(
        currentSpell?.incantation ?? null,
        currentOptions,
        true,
        { reveal: true, winner_house: b.house }
      )

      toast.success(`${delta > 0 ? `+${delta}` : delta} to ${b.house}`)
      // (Optional) remove this buzz from local list to avoid double awarding
      setBuzzes(prev => prev.filter(x => x.id !== b.id))
    } catch (e: any) {
      toast.error(e?.message || 'Could not award points')
    } finally {
      setBusy(false)
    }
  }

  const readyToStart = useMemo(
    () => !!actorName && !!actorHouse && spells.length > 0,
    [actorName, actorHouse, spells]
  )

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Wizard Duel — Actor</h1>
          <Link href="/games/duel/display" className="text-sm underline opacity-90">
            Open Display Page →
          </Link>
        </div>
        <p className="text-sm opacity-80">
          Flow: You act the spell. Audience buzzes and says the incantation.  
          Award <b>+2</b> if the buzzer is from <b>your house</b>, or <b>+1</b> if from another house.
        </p>
      </header>

      {/* Setup */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-sm font-medium">Your Name</div>
            <input
              value={actorName}
              onChange={e=>setActorName(e.target.value)}
              placeholder="Actor name"
              className="w-full rounded bg-white/10 px-3 py-2"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Your House</div>
            <select
              value={actorHouse}
              onChange={e=>setActorHouse(e.target.value as House)}
              className="w-full rounded bg-white/10 px-3 py-2"
            >
              <option value="">Select house…</option>
              {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <label className="text-sm opacity-80">Round timer (seconds)</label>
          <input
            type="number"
            min={10}
            max={180}
            value={seconds}
            onChange={e => {
              const v = Math.max(10, Math.min(180, Number(e.target.value || 45)))
              setSeconds(v)
              if (!turnActive) setTimeLeft(v)
            }}
            className="w-24 rounded bg-white/10 px-2 py-1"
          />
          <button
            onClick={startTurn}
            disabled={!readyToStart || turnActive}
            className="rounded bg-emerald-600 px-3 py-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            Start Turn
          </button>
          <button
            onClick={() => endTurn()}
            disabled={!turnActive}
            className="rounded bg-amber-600 px-3 py-2 hover:bg-amber-700 disabled:opacity-50"
          >
            End Turn
          </button>
        </div>
      </section>

      {/* In-Turn Area */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-80">
            Turn: {turnActive ? <span className="text-emerald-300">ACTIVE</span> : <span className="text-amber-300">INACTIVE</span>}
          </div>
          <div className="text-xl font-semibold tabular-nums">{timeLeft}s</div>
        </div>

        {turnActive ? (
          <>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs opacity-70">Your spell to ACT:</div>

              {currentSpell ? (
                <>
                  {/* Incantation — GOLD and prominent */}
                  <div className="text-3xl font-imfell text-amber-300">
                    {currentSpell.incantation}
                  </div>

                  {/* Name */}
                  {currentSpell.name && (
                    <div className="text-sm opacity-80">
                      <span className="opacity-70">Spell: </span>
                      {currentSpell.name}
                    </div>
                  )}

                  {/* Description */}
                  {currentSpell.description && (
                    <div className="text-sm opacity-90">
                      <span className="opacity-70">What it does: </span>
                      {currentSpell.description}
                    </div>
                  )}

                  {/* Gesture — lighter GOLD */}
                  {currentSpell.gesture && (
                    <div className="pt-2 text-amber-200">
                      <span className="font-medium">Gesture to act:</span>{' '}
                      <i>{currentSpell.gesture}</i>
                    </div>
                  )}
                </>
              ) : (
                <div className="opacity-70">Deal a spell to begin…</div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => dealSpell()}
                disabled={!turnActive}
                className="rounded bg-white/10 px-3 py-2 hover:bg-white/20"
              >
                Deal New Spell
              </button>
              <button
                onClick={() => dealSpell()}
                disabled={!turnActive}
                className="rounded bg-white/10 px-3 py-2 hover:bg-white/20"
              >
                Skip
              </button>
            </div>

            {/* Buzz Queue + Award */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Buzzes (most recent 2 min)</div>
              {buzzes.length === 0 ? (
                <div className="opacity-70 text-sm">Waiting for buzzes…</div>
              ) : (
                <ul className="space-y-2">
                  {buzzes.map(b => {
                    const same = actorHouse && b.house === actorHouse
                    return (
                      <li key={b.id} className="rounded-xl bg-white/10 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{b.display_name}</div>
                            <div className="text-xs opacity-70">
                              {b.house || '—'} • {new Date(b.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => awardForBuzz(b, 2)}
                              disabled={busy || !b.house}
                              className={`rounded px-3 py-1 ${
                                same ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-700/40 hover:bg-emerald-700/60'
                              } disabled:opacity-50`}
                              title={same ? 'Same house (+2)' : 'Use for same-house (+2)'}
                            >
                              +2
                            </button>
                            <button
                              onClick={() => awardForBuzz(b, 1)}
                              disabled={busy || !b.house}
                              className="rounded bg-indigo-600 px-3 py-1 hover:bg-indigo-700 disabled:opacity-50"
                              title="Other house (+1)"
                            >
                              +1
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="opacity-70 text-sm">Start a turn to deal spells and run the timer.</div>
        )}
      </section>

      <p className="text-xs opacity-60">
        Tip: Act big! When someone buzzes and says the incantation, award points: +2 if they’re in your house, +1 if not.
      </p>
    </div>
  )
}
