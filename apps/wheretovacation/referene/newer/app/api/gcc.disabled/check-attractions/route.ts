import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const TIMEOUT_MS = 10000;

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data: attractions, error } = await supabase
      .from('manual_attractions')
      .select('*');

    if (error) {
      throw error;
    }

    const results: Array<{ id: string; name: string; status: string }> = [];

    for (const attraction of attractions || []) {
      if (!attraction.url) {
        results.push({ id: attraction.id, name: attraction.name, status: 'no-url' });
        continue;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const response = await fetch(attraction.url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeout);

        const status = response.ok ? 'open' : 'closed';
        await supabase
          .from('manual_attractions')
          .update({
            status,
            last_checked: new Date().toISOString()
          })
          .eq('id', attraction.id);

        results.push({ id: attraction.id, name: attraction.name, status });
      } catch (error) {
        await supabase
          .from('manual_attractions')
          .update({
            status: 'error',
            last_checked: new Date().toISOString()
          })
          .eq('id', attraction.id);

        results.push({ id: attraction.id, name: attraction.name, status: 'error' });
      }
    }

    return NextResponse.json({
      success: true,
      checked: results.length,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to verify attractions' }, { status: 500 });
  }
}

