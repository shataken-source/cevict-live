import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Dynamic import to avoid webpack issues
const getSupabaseClient = async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      return createClient(supabaseUrl, supabaseServiceKey);
    }
    return null;
  } catch (error) {
    console.error('[BUG REPORT] Failed to load Supabase client:', error);
    return null;
  }
};

interface BugReportBody {
  message: string;
  stack?: string;
  digest?: string;
  page?: string;
  userAgent?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const enabled = process.env.ENABLE_BUG_REPORTING === 'true' || process.env.NEXT_PUBLIC_ENABLE_BUG_REPORTING === 'true';
    if (!enabled) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<BugReportBody>;

    const message = typeof body?.message === 'string' ? body.message : '';
    const stack = typeof body?.stack === 'string' ? body.stack : undefined;
    const digest = typeof body?.digest === 'string' ? body.digest : undefined;
    const page = typeof body?.page === 'string' ? body.page : undefined;
    const userAgent = typeof body?.userAgent === 'string' ? body.userAgent : request.headers.get('user-agent') || undefined;
    const timestamp = typeof body?.timestamp === 'string' ? body.timestamp : new Date().toISOString();
    const context = typeof body?.context === 'object' && body.context ? body.context : undefined;

    if (!message) {
      return NextResponse.json({ error: 'Missing required field: message' }, { status: 400 });
    }

    const report = {
      message,
      stack,
      digest,
      page,
      user_agent: userAgent,
      timestamp,
      context
    };

    console.error('[BUG REPORT]', report);

    const supabase = await getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, stored: false }, { status: 200 });
    }

    const { error } = await supabase.from('bug_reports').insert({
      message,
      stack,
      digest,
      page,
      user_agent: userAgent,
      timestamp,
      context
    });

    if (error) {
      console.error('[BUG REPORT] Failed to store in Supabase:', error);
      return NextResponse.json({ success: true, stored: false }, { status: 200 });
    }

    return NextResponse.json({ success: true, stored: true }, { status: 200 });
  } catch (error: any) {
    console.error('[BUG REPORT] Fatal error:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
