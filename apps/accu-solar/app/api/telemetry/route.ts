import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getUserFromRequest } from '@/app/lib/supabase-server';
import { demoAdapter } from '@/app/lib/telemetry-adapters/demo';
import { victronLocalAdapter } from '@/app/lib/telemetry-adapters/victron-local';
import { bleAdapter } from '@/app/lib/telemetry-adapters/ble';
import type { Telemetry } from '@/app/lib/telemetry-types';

/**
 * GET /api/telemetry?source=demo|victron_local|ble
 *
 * Returns current telemetry from the specified datasource.
 * - demo: simulated data
 * - victron_local: Venus OS / Victron system (LAN)
 * - ble: Bluetooth battery (experimental)
 *
 * Returns error with detailed message if data source fails.
 */
export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get('source') || 'demo';
    const nowMs = Date.now();

    let telemetry: Telemetry | null = null;

    if (source === 'demo') {
      telemetry = await demoAdapter.getTelemetry({
        datasource: {
          id: 'demo',
          user_id: 'demo',
          name: 'Demo Data',
          type: 'demo',
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        nowMs,
      });
    } else if (source === 'victron_local') {
      telemetry = await victronLocalAdapter.getTelemetry({
        datasource: {
          id: 'victron_local',
          user_id: 'default',
          name: 'Victron Local',
          type: 'victron_local',
          config: { host: '192.168.1.50', method: 'mqtt' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        nowMs,
      });
    } else if (source === 'ble') {
      telemetry = await bleAdapter.getTelemetry({
        datasource: {
          id: 'ble',
          user_id: 'demo',
          name: 'BLE Battery',
          type: 'ble',
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        nowMs,
      });
    } else {
      return NextResponse.json(
        { error: 'Unknown source. Use "demo", "victron_local", or "ble".' },
        { status: 400 }
      );
    }

    if (!telemetry) {
      return NextResponse.json(
        { error: 'Failed to retrieve telemetry' },
        { status: 500 }
      );
    }

    return NextResponse.json(telemetry);
  } catch (error: any) {
    console.error('[telemetry GET]', error);

    // Return user-friendly error message
    const errorMessage = error?.message || 'Failed to fetch telemetry';
    const statusCode = error?.name === 'VictronConnectionError' ? 503 : error?.name === 'BleNotConnectedError' ? 400 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        type: error?.name || 'TelemetryError',
      },
      { status: statusCode }
    );
  }
}

/**
 * POST /api/telemetry/ingest
 *
 * Stores telemetry in Supabase for users on Professional tier.
 * Requires:
 *   - Authorization: Bearer <token>
 *   - siteId (UUID): site identifier
 *   - telemetry (Telemetry): the data to store
 *
 * Returns 401 if not authenticated.
 * Returns 403 if tier is Basic (history requires Professional).
 * Returns 403 if siteId does not belong to the user.
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from Authorization header
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - valid authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const body = await request.json();
    const { siteId, telemetry } = body;

    if (!siteId || !telemetry) {
      return NextResponse.json(
        { error: 'Missing siteId or telemetry in body' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Check subscription tier
    const { data: subscription, error: subError } = await supabase
      .from('accu_solar_subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'User subscription not found' },
        { status: 404 }
      );
    }

    const tier = subscription.tier as string;
    if (tier !== 'professional') {
      return NextResponse.json(
        {
          error: 'Telemetry history requires Professional tier',
          tier,
        },
        { status: 403 }
      );
    }

    // Verify site belongs to user
    const { data: site, error: siteError } = await supabase
      .from('accu_solar_sites')
      .select('id')
      .eq('id', siteId)
      .eq('user_id', userId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found or does not belong to user' },
        { status: 403 }
      );
    }

    // Insert telemetry record
    const { error: insertError } = await supabase
      .from('accu_solar_telemetry')
      .insert({
        site_id: siteId,
        ts: telemetry.ts || new Date().toISOString(),
        battery_soc_pct: telemetry.battery_soc_pct,
        battery_v: telemetry.battery_v,
        battery_a: telemetry.battery_a,
        battery_temp_c: telemetry.battery_temp_c,
        solar_w: telemetry.solar_w,
        load_w: telemetry.load_w,
        grid_w: telemetry.grid_w,
        source: 'demo',
      });

    if (insertError) {
      console.error('[telemetry POST] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to store telemetry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Telemetry stored' });
  } catch (error) {
    console.error('[telemetry POST]', error);
    return NextResponse.json(
      { error: 'Failed to process telemetry ingest' },
      { status: 500 }
    );
  }
}
