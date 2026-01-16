import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ShelterRow = {
  id?: string;
  shelter_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  url?: string | null;
  created_at?: string;
  updated_at?: string;
};

function loadLocalShelters(): ShelterRow[] {
  try {
    const p = path.join(process.cwd(), 'apps', 'petreunion', 'data', 'shelters-sample.json');
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.shelters) ? parsed.shelters as ShelterRow[] : [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ shelters: loadLocalShelters(), table_exists: false, db_configured: false }, { status: 200 });
    }

    const params = new URLSearchParams();
    params.set('select', 'id,shelter_name,email,phone,address,city,state,url,created_at,updated_at');
    params.set('order', 'created_at.desc');
    params.set('limit', '200');

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/shelters?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ shelters: loadLocalShelters(), table_exists: false, db_configured: true }, { status: 200 });
    }

    const rows = (await res.json().catch(() => [])) as unknown;
    const shelters = (Array.isArray(rows) ? rows : []) as ShelterRow[];

    if (!shelters.length) {
      return NextResponse.json({ shelters: loadLocalShelters(), table_exists: false, db_configured: true }, { status: 200 });
    }

    return NextResponse.json({ shelters, table_exists: true, db_configured: true }, { status: 200 });
  } catch (error: any) {
    console.error('[SHELTER LIST] Error:', error);
    return NextResponse.json({ shelters: loadLocalShelters(), error: error?.message || 'Failed to load shelters' }, { status: 200 });
  }
}
