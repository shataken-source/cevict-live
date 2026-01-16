import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// --- Types ---
type FeedPet = {
  name: string;
  type: "dog" | "cat";
  breed?: string;
  color: string;
  size: "small" | "medium" | "large" | "giant";
  age?: string;
  gender?: "male" | "female" | "unknown";
  microchipped?: boolean;
  status: "lost" | "found";
  description?: string;
  date_lost?: string;
  date_found?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  location_detail?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  photo_url?: string;
};

type PopulateParams = {
  maxCities?: number;
  startCity?: string;
  startState?: string;
  useCityExpansion?: boolean;
  delayBetweenCities?: number;
};

// --- Helpers ---
function supabaseService() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase service credentials");
  }
  return createClient(supabaseUrl, supabaseKey);
}

function readLocalSample(): FeedPet[] {
  try {
    const samplePath = path.join(process.cwd(), "apps", "petreunion", "data", "sample-lost-pets.json");
    const raw = fs.readFileSync(samplePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.pets) ? (parsed.pets as FeedPet[]) : [];
  } catch {
    return [];
  }
}

async function fetchFeed(): Promise<FeedPet[]> {
  const feedUrl = process.env.PETREUNION_FEED_URL;
  if (!feedUrl) return readLocalSample();

  try {
    const res = await fetch(feedUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json?.pets)) return json.pets as FeedPet[];
    if (Array.isArray(json)) return json as FeedPet[];
    return [];
  } catch (err) {
    console.warn("[populate-database] feed fetch failed, using sample", err);
    return readLocalSample();
  }
}

function toHashKey(p: FeedPet) {
  const parts = [
    p.name || "",
    p.status || "",
    p.location_city || "",
    p.location_state || "",
    p.date_lost || p.date_found || "",
  ];
  return parts.join("|").toLowerCase();
}

// --- GET Handler: Statistics ---
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?select=pet_type,status,location_state&limit=100000`;
    const res = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error('Failed to load stats');

    const rows = (await res.json().catch(() => [])) as any[];
    const stats = {
      totalPets: rows.length,
      dogs: rows.filter(r => String(r.pet_type || r.type || '').toLowerCase() === 'dog').length,
      cats: rows.filter(r => String(r.pet_type || r.type || '').toLowerCase() === 'cat').length,
      foundPets: rows.filter(r => ['found', 'reunited'].includes(String(r.status).toLowerCase())).length,
      lostPets: rows.filter(r => String(r.status).toLowerCase() === 'lost').length,
      petsByState: rows.reduce((acc, r) => {
        const s = r.location_state || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({ success: true, stats }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// --- POST Handler: Populate Database ---
export async function POST(request: NextRequest) {
  try {
    // 1. Get optional params from body
    const body = (await request.json().catch(() => ({}))) as PopulateParams;
    
    // 2. Fetch data
    const pets = await fetchFeed();
    if (!pets.length) {
      return NextResponse.json({ success: false, error: "No pets in feed" }, { status: 200 });
    }

    const supabase = supabaseService();

    // 3. Preload existing to avoid duplicates
    const { data: existing } = await supabase
      .from("lost_pets")
      .select("pet_name,status,location_city,location_state,date_lost,date_found");

    const existingSet = new Set(
      (existing || []).map((row) =>
        [
          row.pet_name || "",
          row.status || "",
          row.location_city || "",
          row.location_state || "",
          row.date_lost || row.date_found || "",
        ].join("|").toLowerCase()
      )
    );

    // 4. Map and Filter
    const toInsert = pets
      .filter((p) => p.name && p.type && p.color)
      .filter((p) => !existingSet.has(toHashKey(p)))
      .map((p) => ({
        pet_name: p.name,
        pet_type: p.type,
        breed: p.breed || null,
        color: p.color,
        status: p.status,
        size: p.size || null,
        age: p.age || null,
        gender: p.gender || "unknown",
        microchipped: p.microchipped ?? false,
        description: p.description || null,
        date_lost: p.date_lost ? new Date(p.date_lost).toISOString() : null,
        date_found: p.date_found ? new Date(p.date_found).toISOString() : null,
        location_city: p.location_city || null,
        location_state: p.location_state || null,
        location_zip: p.location_zip || null,
        location_detail: p.location_detail || null,
        owner_name: p.owner_name || null,
        owner_email: p.owner_email || null,
        owner_phone: p.owner_phone || null,
        photo_url: p.photo_url || null,
      }));

    // 5. Insert
    if (!toInsert.length) {
      return NextResponse.json({ success: true, inserted: 0, skipped: pets.length }, { status: 200 });
    }

    const { error } = await supabase.from("lost_pets").insert(toInsert);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      inserted: toInsert.length,
      skipped: pets.length - toInsert.length,
    }, { status: 200 });

  } catch (err: any) {
    console.error("[populate-database] failed", err);
    return NextResponse.json({ success: false, error: err?.message || "populate failed" }, { status: 500 });
  }
}