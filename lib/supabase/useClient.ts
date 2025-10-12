'use client'
import { createClient } from '@supabase/supabase-js'
export function useSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}
