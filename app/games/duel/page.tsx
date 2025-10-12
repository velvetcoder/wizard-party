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


const HOUSES = ['Gryffindor','Ravenclaw','Hufflepuff','Slytherin'] as const
type House = typeof HOUSES[number]

const FALLBACK_SPELLS: Spell[] = [
  { name: 'Disarming Charm', incantation: 'Expelliarmus', description: null, gesture: 'Your wand flies from your hand' },
  { name: 'Stunning Spell', incantation: 'Stupefy', description: null, gesture: 'Freeze and fall backward a bit' },
  { name: 'Shield Charm', incantation: 'Protego', description: null, gesture: 'Throw up a shield in front of you' },
  { name: 'Body-Bind Curse', incantation: 'Petrificus Totalus', description: null, gesture: 'Lock your body stiff like a board' },
  { name: 'Tickling Charm', incantation: 'Rictusempra', description: null, gesture: 'Burst into uncontrollable giggles' },
  { name: 'Dancing Feet Spell', incantation: 'Tarantallegra', description: null, gesture: 'Legs dance wildly without control' },
  { name: 'Memory Charm', incantation: 'Obliviate', description: null, gesture: 'Look confused; forget where you are' },
  { name: 'Wand-Lighting Charm', incantation: 'Lumos', description: null, gesture: 'Hold wand like a flashlight, peer around' },
  { name: 'Extinguishing Charm', incantation: 'Nox', description: null, gesture: '“Switch off” your imaginary light' },
  { name: 'Levitation Charm', incantation: 'Wingardium Leviosa', description: null, gesture: 'Mime lifting a feather to float' },
  { name: 'Confundus Charm', incantation: 'Confundo', description: null, gesture: 'Stagger and double-take, very puzzled' },
  { name: 'Water-Repelling Charm', incantation: 'Impervius', description: null, gesture: 'Brush off imaginary rain with pride' },
  { name: 'Freezing Charm', incantation: 'Immobulus', description: null, gesture: 'Freeze mid-motion; unfreeze slowly' },
  { name: 'Silencing Charm', incantation: 'Silencio', description: null, gesture: 'Mouth moves but no sound; mime frustration' },
  { name: 'Engorgement Charm', incantation: 'Engorgio', description: null, gesture: 'Mime an object growing huge' },
  { name: 'Shrinking Charm', incantation: 'Reducio', description: null, gesture: 'Mime an object shrinking tiny' },
]

export default function WizardDuelPage() {
  const supabase = useSupabaseBrowser()

  // Setup: names & houses
  const [casterName, setCasterName] = useState('')
  const [casterHouse, setCasterHouse] = useState<House | ''>('')
  const [actorName, setActorName] = useState('')
  const [actorHouse, setActorHouse] = useState<House | ''>('')

  // Spells
  const [spells, setSpells] = useState<Spell[]>([])
  const [usedIdsThisTurn, setUsedIdsThisTurn] = useState<string[]>([])
  const [currentSpell, setCurrentSpell] = useState<Spell | null>(null)

  // Turn & timer
  const [turnActive, setTurnActive] = useState(false)
  const [seconds, setSeconds] = useState(45)     // configurable
  const [timeLeft, setTimeLeft] = useState(45)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Busy flag for network
  const [busy, setBusy] = useState(false)

  // --- Load spells (prefer DB, else fallback) ---
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('wizard_spells') // must contain: id, name, incantation, description, gesture
        .select('id, name, incantation, description, gesture')
        .order('name', { ascending: true })
        .limit(200)
      if (!error && data && data.length > 0) {
        setSpells(data as Spell[])
      } else {
        setSpells(FALLBACK_SPELLS)
      }
    })()
  }, [supabase])

  async function publishRound(spellName: string | null, allOptions: string[] | null, active: boolean) {
  // Upsert id=1 with the current state (so the display page can read it)
  await fetch('/api/duel/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      active,
      current_spell: spellName,
      options: allOptions,
    }),
  }).catch(()=>{})
}


  // Persist last settings locally (so hosts don’t retype)
  useEffect(() => {
    setCasterName(localStorage.getItem('duel_caster_name') || '')
    setCasterHouse((localStorage.getItem('duel_caster_house') as House) || '')
    setActorName(localStorage.getItem('duel_actor_name') || '')
    setActorHouse((localStorage.getItem('duel_actor_house') as House) || '')
    const savedSecs = Number(localStorage.getItem('duel_seconds') || '45')
    if (Number.isFinite(savedSecs) && savedSecs > 0) {
      setSeconds(savedSecs)
      setTimeLeft(savedSecs)
    }
  }, [])
  useEffect(() => { localStorage.setItem('duel_caster_name', casterName) }, [casterName])
  useEffect(() => { if (casterHouse) localStorage.setItem('duel_caster_house', casterHouse) }, [casterHouse])
  useEffect(() => { localStorage.setItem('duel_actor_name', actorName) }, [actorName])
  useEffect(() => { if (actorHouse) localStorage.setItem('duel_actor_house', actorHouse) }, [actorHouse])
  useEffect(() => { localStorage.setItem('duel_seconds', String(seconds)) }, [seconds])

  // --- Timer mechanics ---
  useEffect(() => {
    if (!turnActive) return
    if (timeLeft <= 0) {
      endTurn(false) // auto-end with no points when timer hits 0
      return
    }
    timerRef.current && clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => { timerRef.current && clearTimeout(timerRef.current) }
  }, [turnActive, timeLeft])

  async function resetDeckOnceAtStartOfGame() {
    await fetch('/api/duel/deck/reset', { method: 'POST' }).catch(()=>{})
    }
  function startTurn() {
    if (!casterHouse || !actorHouse || !casterName || !actorName) {
      toast.error('Enter both wizards and houses first.')
      return
    }
    setTurnActive(true)
    setTimeLeft(seconds)
    resetDeckOnceAtStartOfGame()
    dealSpell(true)
  }

  function endTurn(showToast = true) {
    setTurnActive(false)
    setCurrentSpell(null)
    setUsedIdsThisTurn([])
    setTimeLeft(seconds)
    publishRound(null, null, false)
    if (showToast) toast.message('Turn ended.')
  }

  function uniqueDecoys(allNames: string[], correct: string, needed = 4): string[] {
    const pool = allNames.filter(n => n !== correct)
    // shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, Math.min(needed, pool.length))
  }

  async function dealSpell(_resetIfExhausted = false) {
    // draw next from server
    const res = await fetch('/api/duel/deck/draw', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.ok) {
        toast.error(j?.error || 'Could not draw spell')
        return
    }

    // deck empty
    if (!j.spell) {
        toast.info('Deck exhausted — no more spells!')
        setCurrentSpell(null)
        // still mark the round as active=false for admin/display, adjust if you prefer to keep it active
        publishRound(null, null, false)
        return
    }

    // normalize the spell shape
    const pick = j.spell as Spell
    if (!pick.incantation) {
        toast.error('Spell data missing incantation')
        return
    }

    setCurrentSpell(pick)

    // Build decoys from other incantations
    const bank =
        (spells.length ? spells : FALLBACK_SPELLS)
        .map(s => s.incantation)
        .filter(Boolean) as string[]

    const correct = pick.incantation
    const pool = bank.filter(n => n !== correct)

    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[k]] = [pool[k], pool[i]]
    }

    const decoys = pool.slice(0, 4)
    const options = [...decoys, correct].sort(() => Math.random() - 0.5)

    // publish to display/admin: the answer is the INCANTATION
    publishRound(correct, options, true)
    }

  // --- Awards ---
  async function awardPoints(house: House, delta: number, reason: string) {
    const res = await fetch('/api/admin/points/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house, delta, reason }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.ok) throw new Error(j?.error || 'Award failed')
  }

  async function markCorrect() {
    if (!turnActive || !currentSpell) return
    if (!casterHouse || !actorHouse) return
    try {
      setBusy(true)
      // Wizard B (actor) +2
      await awardPoints(actorHouse as House, 2, `Wizard Duel — ${actorName} acted “${currentSpell.name}”`)
      // Wizard A (caster) +1
      await awardPoints(casterHouse as House, 1, `Wizard Duel — ${casterName} cast “${currentSpell.name}”`)
      toast.success(`Correct! +2 to ${actorHouse}, +1 to ${casterHouse}`)
      // Next spell if time remains; else end
      if (timeLeft > 3) {
        dealSpell()
      } else {
        endTurn(false)
        toast.message('Time! Turn ended.')
      }
    } catch (e: any) {
      toast.error(e.message || 'Could not award points')
    } finally {
      setBusy(false)
    }
  }

  async function audienceSteal() {
    if (!turnActive || !currentSpell) return
    // Optional: pick which house stole (prompt)
    const stealHouse = prompt('Audience steal! Enter House (Gryffindor, Ravenclaw, Hufflepuff, Slytherin):')
    const h = (stealHouse || '').trim()
    if (!HOUSES.includes(h as House)) {
      toast.error('Invalid house.')
      return
    }
    try {
      setBusy(true)
      await awardPoints(h as House, 1, `Wizard Duel — Audience steal on “${currentSpell.name}”`)
      toast.success(`Audience steal! +1 to ${h}`)
      if (timeLeft > 3) dealSpell()
      else endTurn(false)
    } catch (e: any) {
      toast.error(e.message || 'Could not award steal point')
    } finally {
      setBusy(false)
    }
  }

  const readyToStart = useMemo(
    () => !!casterName && !!actorName && !!casterHouse && !!actorHouse && spells.length > 0,
    [casterName, actorName, casterHouse, actorHouse, spells]
  )

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Wizard Duel</h1>
          <Link href="/games/duel/display" className="text-sm underline opacity-90">
            Open Display Page →
          </Link>
        </div>
        <p className="text-sm opacity-80">
          Flow: Wizard A <span className="opacity-60">(caster)</span> casts → Wizard B <span className="opacity-60">(victim)</span> acts → Wizard A + house mates.
          Correct: <b>+2</b> to Victim’s House, <b>+1</b> to Caster’s House. Optional audience steal <b>+1</b>.
        </p>
      </header>

      {/* Setup */}
      <section className="rounded-2xl bg-white/10 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-sm font-medium">Wizard A — Caster</div>
            <input
              value={casterName}
              onChange={e=>setCasterName(e.target.value)}
              placeholder="Caster name"
              className="w-full rounded bg-white/10 px-3 py-2"
            />
            <select
              value={casterHouse}
              onChange={e=>setCasterHouse(e.target.value as House)}
              className="w-full rounded bg-white/10 px-3 py-2"
            >
              <option value="">Select house…</option>
              {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Wizard B — Victim</div>
            <input
              value={actorName}
              onChange={e=>setActorName(e.target.value)}
              placeholder="Victim name"
              className="w-full rounded bg-white/10 px-3 py-2"
            />
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
              <div className="text-xs opacity-70">Spell for the ACTOR (Wizard B):</div>
              {currentSpell ? (
                <>
                {/* Incantation — GOLD and prominent */}
                <div className="text-3xl font-imfell text-amber-300">
                    {currentSpell.incantation}
                </div>

                {/* Thematic name (optional to show; keep subtle) */}
                {currentSpell.name && (
                    <div className="text-sm opacity-80">
                    <span className="opacity-70">Spell: </span>
                    {currentSpell.name}
                    </div>
                )}

                {/* Description (if present) */}
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
                onClick={markCorrect}
                disabled={!turnActive || !currentSpell || busy}
                className="rounded bg-emerald-600 px-3 py-2 hover:bg-emerald-700 disabled:opacity-50"
              >
                They got it! (+2 {actorHouse || 'Actor House'}, +1 {casterHouse || 'Caster House'})
              </button>

              <button
                onClick={audienceSteal}
                disabled={!turnActive || !currentSpell || busy}
                className="rounded bg-indigo-600 px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
              >
                Audience Steal (+1)
              </button>
            </div>
          </>
        ) : (
          <div className="opacity-70 text-sm">Start a turn to deal spells and run the timer.</div>
        )}
      </section>

      <p className="text-xs opacity-60">
        Tip: For clarity, have the actor face the audience while the caster and house guess together. You can redeal
        a spell if the first one feels awkward—just keep an eye on the timer!
      </p>
    </div>
  )
}
