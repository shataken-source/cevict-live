import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret') || ''
  if (secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: string[] = []

  // Create profiles table
  const { error: createErr } = await supabase.rpc('exec_ddl', {
    sql: `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','elite')),
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_status TEXT DEFAULT 'inactive',
        manual_override BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    `
  })

  if (createErr) {
    // Table may already exist — try direct upsert anyway
    results.push(`Table create: ${createErr.message}`)
  } else {
    results.push('Table created OK')
  }

  // Upsert shataken@gmail.com as elite
  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert({
      email: 'shataken@gmail.com',
      tier: 'elite',
      manual_override: true,
      subscription_status: 'inactive',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })

  if (upsertErr) {
    results.push(`Upsert error: ${upsertErr.message}`)
  } else {
    results.push('shataken@gmail.com → elite ✓')
  }

  // Verify
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, tier, manual_override')
    .eq('email', 'shataken@gmail.com')
    .single()

  return NextResponse.json({ results, profile })
}
