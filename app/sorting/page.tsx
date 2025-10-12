'use client'

import { useMemo, useState } from 'react'
import raw from './questions.json'
import { scoreSortingHat, House } from './score'

// Type the imported JSON so TS knows it has questions
interface Option {
  id: string
  label: string
  weights: Record<House, number>
}
interface Question {
  id: string
  prompt: string
  options: Option[]
}
interface SortingData {
  houses: House[]
  questions: Question[]
}
const data = raw as SortingData

const houseColors: Record<House, string> = {
  Gryffindor: 'text-red-400',
  Ravenclaw: 'text-blue-400',
  Hufflepuff: 'text-yellow-300',
  Slytherin: 'text-emerald-400',
}

export default function SortingPage() {
  const [idx, setIdx] = useState(0)                               // current question index
  const [answers, setAnswers] = useState<Record<string, string>>({}) // qid -> option id
  const [submitted, setSubmitted] = useState(false)

  const total = data.questions.length
  const q = data.questions[idx]

  const { tally, winner } = useMemo(() => {
    if (!submitted) return { tally: { Gryffindor:0, Ravenclaw:0, Hufflepuff:0, Slytherin:0 } as Record<House, number>, winner: 'Gryffindor' as House }
    return scoreSortingHat(answers)
  }, [submitted, answers])

  function choose(optionId: string) {
    setAnswers(prev => ({ ...prev, [q.id]: optionId }))
  }

  function next() {
    if (idx < total - 1) setIdx(idx + 1)
  }

  function back() {
    if (idx > 0) setIdx(idx - 1)
  }

  function submit() {
    // basic guard: only submit if all answered
    if (Object.keys(answers).length < total) return
    setSubmitted(true)
    // optional: scroll to top for reveal
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function restart() {
    setAnswers({})
    setIdx(0)
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <h1 className="text-4xl font-medieval text-center">The Sorting Hat Speaks…</h1>
        <p className={`text-3xl font-bold text-center ${houseColors[winner]}`}>🪄 {winner}!</p>

        <div className="mx-auto max-w-md rounded-2xl bg-white/10 p-4">
          <h2 className="text-lg font-semibold mb-2">Your scores</h2>
          <ul className="space-y-1 text-sm">
            {(Object.keys(tally) as House[]).map(h => (
              <li key={h} className="flex items-center justify-between">
                <span className={`${houseColors[h]} font-medium`}>{h}</span>
                <span className="font-semibold">{tally[h]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button onClick={restart} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">
            Take Again
          </button>
          <a href="/house" className="rounded-xl bg-emerald-600 px-4 py-2 hover:bg-emerald-700">
            Go to Houses
          </a>
          <a
            href={`/enter?house=${encodeURIComponent(winner)}`}
            className="rounded-xl bg-indigo-600 px-4 py-2 hover:bg-indigo-700"
          >
            Go to Check-In
          </a>
        </div>
      </div>
    )
  }

  // Progress
  const answered = Object.keys(answers).length
  const pct = Math.round((answered / total) * 100)

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="text-center space-y-1">
        <h1 className="text-4xl font-medieval">Sorting Hat Quiz</h1>
        <p className="opacity-80">Question {idx + 1} of {total}</p>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-imfell">{q.prompt}</h2>

        <div className="grid gap-3">
          {q.options.map(o => {
            const selected = answers[q.id] === o.id
            return (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                className={`text-left rounded-2xl px-4 py-3 border transition ${
                  selected
                    ? 'border-emerald-400 bg-emerald-500/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                    selected ? 'border-emerald-400 bg-emerald-500/30' : 'border-white/30'
                  }`}>
                    {selected ? '✓' : ''}
                  </span>
                  <span>{o.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <footer className="flex items-center justify-between">
        <button
          onClick={back}
          disabled={idx === 0}
          className="rounded-xl bg-white/10 px-4 py-2 disabled:opacity-50 hover:bg-white/20"
        >
          ← Back
        </button>

        {idx < total - 1 ? (
          <button
            onClick={next}
            disabled={!answers[q.id]}
            className="rounded-xl bg-white/10 px-4 py-2 disabled:opacity-50 hover:bg-white/20"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={answered < total}
            className="rounded-xl bg-emerald-600 px-4 py-2 disabled:opacity-50 hover:bg-emerald-700"
          >
            Reveal My House 🪄
          </button>
        )}
      </footer>
    </div>
  )
}
