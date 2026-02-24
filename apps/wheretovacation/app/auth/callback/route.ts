import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[OAuth Callback] Supabase not configured')
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent('Supabase is not configured')}`, request.url)
    )
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[OAuth Callback] Error:', error)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL('/auth/login', request.url))
}
