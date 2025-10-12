import raw from './questions.json'

// --- Types that describe the JSON structure ---
export type House = 'Gryffindor' | 'Ravenclaw' | 'Hufflepuff' | 'Slytherin'

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

// Tell TS what the imported JSON looks like
const data = raw as SortingData

// answers: map of questionId -> optionId (e.g., { q1: "b", q2: "d", ... })
export function scoreSortingHat(answers: Record<string, string>) {
  const tally: Record<House, number> = {
    Gryffindor: 0,
    Ravenclaw: 0,
    Hufflepuff: 0,
    Slytherin: 0,
  }

  for (const q of data.questions) {
    const choiceId = answers[q.id]
    if (!choiceId) continue
    const opt = q.options.find(o => o.id === choiceId)
    if (!opt) continue
    for (const [house, pts] of Object.entries(opt.weights) as [House, number][]) {
      tally[house] += pts
    }
  }

  // Decide the winner (stable tie-break order)
  const order: House[] = ['Gryffindor', 'Ravenclaw', 'Hufflepuff', 'Slytherin']
  const winner = order.reduce((best, h) => (tally[h] > tally[best] ? h : best), order[0])

  return { tally, winner }
}
