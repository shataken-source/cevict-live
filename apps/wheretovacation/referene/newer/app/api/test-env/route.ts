import { NextResponse } from 'next/server';

export async function GET() {
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return NextResponse.json({
    supabaseConfigured: hasSupabaseUrl && (hasServiceKey || hasAnonKey),
    hasSupabaseUrl,
    hasServiceKey,
    hasAnonKey,
    nodeEnv: process.env.NODE_ENV
  });
}


