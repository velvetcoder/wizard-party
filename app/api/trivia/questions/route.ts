import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const s = createServerClient();
    const { data, error } = await s
      .from('trivia_questions')
      .select('id, text')     // only what UI needs
      .eq('active', true)     // if you have an active flag
      .order('sort_order', { ascending: true }) // or created_at
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ ok:true, data });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message || 'load failed' }, { status: 500 });
  }
}
