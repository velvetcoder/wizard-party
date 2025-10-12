'use server'
import { createServerClient } from '@/lib/supabase/server'

export async function startTrivia(questionId: number) {
  const s = await  createServerClient()
  let { data: sessions } = await s.from('trivia_sessions').select('*').limit(1)
  let sessionId = sessions?.[0]?.id
  if (!sessionId) {
    const { data: inserted } = await s.from('trivia_sessions').insert({ active: true, active_question_id: questionId }).select().single()
    sessionId = inserted?.id
  } else {
    await s.from('trivia_sessions').update({ active: true, active_question_id: questionId, updated_at: new Date().toISOString() }).eq('id', sessionId)
  }
  await s.from('trivia_buzzes').delete().neq('id', -1)
  return { ok: true, sessionId }
}

export async function stopTrivia() {
  const s = await createServerClient()
  const { data: sessions } = await s.from('trivia_sessions').select('*').limit(1)
  const sessionId = sessions?.[0]?.id
  if (sessionId) await s.from('trivia_sessions').update({ active: false }).eq('id', sessionId)
  return { ok: true }
}

export async function seedTrivia() {
  const s = await createServerClient()
  const sample = [
    { category: 'Spells & Potions', question: 'What spell disarms an opponent?', answer: 'Expelliarmus', difficulty: 1 },
    { category: 'Magical Creatures', question: 'What creature guards Gringotts vaults?', answer: 'Dragon', difficulty: 1 },
    { category: 'Hogwarts', question: 'Who is headmaster in most of the series?', answer: 'Albus Dumbledore', difficulty: 1 },
  ]
  for (const q of sample) await s.from('trivia_questions').insert(q)
  return { ok: true }
}
