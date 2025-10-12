import { NextResponse } from 'next/server'
import { seedTrivia } from '@/app/actions/trivia'
export async function POST() {
  const res = await seedTrivia()
  return NextResponse.json(res)
}
