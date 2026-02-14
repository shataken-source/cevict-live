import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase'
import type { Locale } from '@/lib/translations'

export const dynamic = 'force-dynamic'

// Get current user's preferred language
export async function GET() {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ language: 'en' })
  }

  const supabase = getSupabaseAdminClient()
  if (!supabase) {
    return NextResponse.json({ language: 'en' })
  }

  const { data } = await supabase
    .from('shared_users')
    .select('preferred_language')
    .eq('id', user.id)
    .single()

  const language = (data?.preferred_language as Locale | undefined) || 'en'
  return NextResponse.json({ language })
}

// Update current user's preferred language
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let body: { language?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed: Locale[] = ['en', 'es', 'fr', 'pt']
  const lang = (body.language || '').trim().toLowerCase()
  if (!allowed.includes(lang as Locale)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  const { error } = await supabase
    .from('shared_users')
    .update({ preferred_language: lang })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, language: lang })
}

