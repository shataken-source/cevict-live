import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Platform = "facebook" | "instagram" | "tiktok";

type ScrapeRequest = {
  platforms?: Platform[];
  location?: string;
  maxResults?: number;
  saveToDatabase?: boolean;
};

type DiscoveredPage = {
  platform: Platform;
  handle: string;
  url: string;
  state?: string;
  followers?: number;
};

type PetRecord = {
  pet_name: string;
  pet_type: string;
  breed: string | null;
  color: string | null;
  size: string | null;
  age: string | null;
  gender: string | null;
  status: string;
  location_city: string | null;
  location_state: string | null;
  description: string | null;
  photo_url: string | null;
  source_platform: string;
  source_url: string | null;
  source_post_id: string;
  shelter_name: string | null;
};

const DEFAULT_PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok"];
const HASHTAGS = ["lostdog", "founddog", "lostcat", "foundcat", "adoptme", "shelterpet", "rescuedog", "rescuecat"];

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function simulatePets(platform: Platform, location?: string, count: number = 10): PetRecord[] {
  const cities = ["Birmingham", "Houston", "Dallas", "Miami", "San Diego", "Atlanta", "Phoenix"];
  const states = ["AL", "TX", "FL", "CA", "GA", "AZ"];
  const breeds = ["Mixed", "Labrador", "Shepherd", "Pit Bull Mix", "Tabby", "Domestic Shorthair"];
  const colors = ["Brown", "Black", "White", "Gray", "Tan", "Calico"];
  const sizes = ["small", "medium", "large"];
  const genders = ["male", "female", "unknown"];
  const pets: PetRecord[] = [];

  for (let i = 0; i < count; i++) {
    const city = location || randomFrom(cities);
    const state = randomFrom(states);
    const pet_type = Math.random() > 0.35 ? "dog" : "cat";
    pets.push({
      pet_name: pet_type === "dog" ? "Buddy" : "Luna",
      pet_type,
      breed: randomFrom(breeds),
      color: randomFrom(colors),
      size: randomFrom(sizes),
      age: null,
      gender: randomFrom(genders),
      status: Math.random() > 0.5 ? "lost" : "found",
      location_city: city,
      location_state: state,
      description: `Seen near ${city}, ${state}. ${pet_type}.`,
      photo_url: null,
      source_platform: platform,
      source_url: `https://example.com/${platform}/post/${i}`,
      source_post_id: `${platform}_sim_${i}_${Date.now()}`,
      shelter_name: null,
    });
  }
  return pets;
}

async function savePets(pets: PetRecord[]) {
  if (!pets.length) return { inserted: 0, skipped: 0 };
  const supabase = getSupabase();
  if (!supabase) {
    return { inserted: 0, skipped: pets.length };
  }
  const ids = pets.map((p) => p.source_post_id);
  const { data: existing } = await supabase.from("lost_pets").select("source_post_id").in("source_post_id", ids);
  const existingIds = new Set((existing || []).map((r: any) => r.source_post_id));
  const newPets = pets.filter((p) => !existingIds.has(p.source_post_id));
  if (newPets.length > 0) {
    const { error } = await supabase.from("lost_pets").insert(newPets);
    if (error) throw new Error(error.message);
  }
  return { inserted: newPets.length, skipped: pets.length - newPets.length };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as ScrapeRequest;
    const platforms = (body.platforms && body.platforms.length ? body.platforms : DEFAULT_PLATFORMS).filter((p) =>
      ["facebook", "instagram", "tiktok"].includes(p)
    ) as Platform[];
    const maxResults = Math.max(5, Math.min(body.maxResults || 30, 200));
    const saveToDatabase = body.saveToDatabase !== false; // default true
    const location = body.location;

    // For now, simulate discovery; real API integrations for IG/TikTok require credentials/review.
    const discoveredPages: DiscoveredPage[] = platforms.map((p) => ({
      platform: p,
      handle: `${p}-shelter-demo`,
      url: `https://www.${p}.com/shelter-demo`,
      state: "AL",
      followers: 10000,
    }));

    const pets: PetRecord[] = [];
    for (const platform of platforms) {
      pets.push(...simulatePets(platform, location, Math.min(maxResults, 20)));
    }

    let inserted = 0;
    let skipped = 0;
    if (saveToDatabase && pets.length) {
      const res = await savePets(pets);
      inserted = res.inserted;
      skipped = res.skipped;
    }

    return NextResponse.json({
      success: true,
      summary: {
        platforms,
        hashtags: HASHTAGS,
        pagesDiscovered: discoveredPages.length,
        petsFound: pets.length,
        petsSaved: inserted,
        duplicatesSkipped: skipped,
      },
      pages: discoveredPages,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Scrape failed" }, { status: 500 });
  }
}
