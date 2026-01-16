import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

let tokenCache: { access_token: string; expires_at: number } | null = null;

async function getPetfinderToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expires_at > now + 60000) return tokenCache.access_token;

  const clientId = process.env.PETFINDER_API_KEY;
  const clientSecret = process.env.PETFINDER_API_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing PETFINDER_API_KEY or PETFINDER_API_SECRET");

  const response = await fetch("https://api.petfinder.com/v2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  if (!response.ok) throw new Error("Petfinder auth failed");
  const data = await response.json();
  tokenCache = { access_token: data.access_token, expires_at: now + data.expires_in * 1000 };
  return tokenCache.access_token;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { state = "US", maxPets = 100, pages = 2 } = body;
    const token = await getPetfinderToken();
    const supabase = getSupabase();
    let totalSaved = 0, totalFound = 0;

    for (let page = 1; page <= pages; page++) {
      const url = `https://api.petfinder.com/v2/animals?location=${state}&limit=${Math.min(100, maxPets)}&page=${page}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) break;
      const data = await res.json();
      const animals = data.animals || [];
      if (animals.length === 0) break;
      totalFound += animals.length;

      const pets = animals.map((a: any) => ({
        pet_name: a.name || "Unknown",
        pet_type: a.species?.toLowerCase() === "dog" ? "dog" : a.species?.toLowerCase() === "cat" ? "cat" : "other",
        breed: a.breeds?.primary || "Mixed",
        color: a.colors?.primary || "Unknown",
        size: a.size?.toLowerCase().includes("small") ? "small" : a.size?.toLowerCase().includes("large") ? "large" : "medium",
        age: a.age?.toLowerCase() || "unknown",
        gender: a.gender?.toLowerCase() === "male" ? "male" : a.gender?.toLowerCase() === "female" ? "female" : "unknown",
        location_city: a.contact?.address?.city || "",
        location_state: a.contact?.address?.state || "",
        status: "found",
        description: a.description?.slice(0, 500) || "",
        photo_url: a.photos?.[0]?.large || null,
        source: "petfinder_seed",
        source_id: `pf_${a.id}`,
        date_found: new Date().toISOString(),
      }));

      const ids = pets.map((p: any) => p.source_id);
      const { data: existing } = await supabase.from("pets").select("source_id").in("source_id", ids);
      const existingIds = new Set((existing || []).map((e: any) => e.source_id));
      const newPets = pets.filter((p: any) => !existingIds.has(p.source_id));

      if (newPets.length > 0) {
        const { error } = await supabase.from("pets").insert(newPets);
        if (!error) totalSaved += newPets.length;
      }
    }
    return NextResponse.json({ success: true, summary: { petsFound: totalFound, petsSaved: totalSaved, duplicatesSkipped: totalFound - totalSaved } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
