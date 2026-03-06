import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/telemetry/ingest
// Accepts telemetry data from the BMS bridge script and stores in Supabase.
// Also stores the latest reading in-memory for fast polling.
// Auth: simple shared secret in Authorization header.

let latestReading: Record<string, any> | null = null;
let lastIngestTime = 0;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  // Auth check
  const secret = process.env.TELEMETRY_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (body.voltage == null || body.soc == null) {
      return NextResponse.json({ error: 'Missing voltage or soc' }, { status: 400 });
    }

    const reading = {
      voltage: Number(body.voltage),
      current: Number(body.current ?? 0),
      soc: Number(body.soc),
      power: Number(body.power ?? 0),
      temperature: Number(body.temperature ?? body.temp ?? 25),
      cycles: Number(body.cycles ?? 0),
      capacity_remain: Number(body.capacity_remain ?? 0),
      capacity_full: Number(body.capacity_full ?? 0),
      cells: body.cells ?? null,
      health: body.health ?? 'Normal',
      battery_id: body.battery_id ?? 'primary',
      timestamp: body.timestamp ?? new Date().toISOString(),
    };

    // Store in memory for fast polling
    latestReading = reading;
    lastIngestTime = Date.now();

    // Store in Supabase for historical data
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('telemetry')
        .insert({
          battery_id: reading.battery_id,
          voltage: reading.voltage,
          current: reading.current,
          soc: reading.soc,
          power: reading.power,
          temperature: reading.temperature,
          cycles: reading.cycles,
          capacity_remain: reading.capacity_remain,
          capacity_full: reading.capacity_full,
          cells: reading.cells,
          health: reading.health,
          recorded_at: reading.timestamp,
        });

      if (error) {
        console.error('[Telemetry] Supabase insert error:', error.message);
        // Don't fail the request — in-memory still works
      }
    }

    return NextResponse.json({ ok: true, timestamp: reading.timestamp });
  } catch (e: any) {
    console.error('[Telemetry] Ingest error:', e.message);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// GET /api/telemetry/ingest — poll latest reading
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const history = url.searchParams.get('history');

  // Return historical data from Supabase
  if (history) {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const hours = Math.min(168, Math.max(1, parseInt(history) || 24));
    const since = new Date(Date.now() - hours * 3600_000).toISOString();

    const { data, error } = await supabase
      .from('telemetry')
      .select('*')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ readings: data, count: data?.length ?? 0 });
  }

  // Return latest reading from memory
  if (!latestReading) {
    return NextResponse.json({
      connected: false,
      message: 'No telemetry data received yet. Run the BMS bridge script.',
      reading: null,
    });
  }

  const staleMs = Date.now() - lastIngestTime;
  return NextResponse.json({
    connected: staleMs < 30_000, // consider stale after 30s
    staleMs,
    reading: latestReading,
  });
}
