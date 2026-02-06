import { NextRequest, NextResponse } from "next/server";
import { insertPetsSafely, PetToInsert } from "@/lib/scraper-utils";

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

const DEFAULT_PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok"];
const HASHTAGS = ["lostdog", "founddog", "lostcat", "foundcat", "adoptme", "shelterpet", "rescuedog", "rescuecat"];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getSupabaseClient } from '@/lib/supabase-client';

function getSupabase() {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function simulatePets(platform: Platform, location?: string, count: number = 10): PetToInsert[] {
  // Map cities to their correct states
  const cityStateMap: Record<string, string> = {
    "Birmingham": "AL",
    "Houston": "TX",
    "Dallas": "TX",
    "Miami": "FL",
    "San Diego": "CA",
    "Atlanta": "GA",
    "Phoenix": "AZ",
  };
  const cities = ["Birmingham", "Houston", "Dallas", "Miami", "San Diego", "Atlanta", "Phoenix"];
  const breeds = ["Mixed", "Labrador", "Shepherd", "Pit Bull Mix", "Tabby", "Domestic Shorthair"];
  const colors = ["Brown", "Black", "White", "Gray", "Tan", "Calico"];
  const sizes = ["small", "medium", "large"];
  const genders = ["male", "female", "unknown"];
  const pets: PetToInsert[] = [];

  for (let i = 0; i < count; i++) {
    const city = location || randomFrom(cities);
    // Use the correct state for the city, default to AL if not found
    const state = cityStateMap[city] || "AL";
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
      owner_name: 'Community',
      date_lost: Math.random() > 0.5 ? new Date().toISOString().split('T')[0] : null,
      date_found: Math.random() > 0.5 ? new Date().toISOString().split('T')[0] : null,
    });
  }
  return pets;
}

export async function POST(request: NextRequest) {
  // DISABLED: This scraper generates fake data which is harmful for a lost pet finding app
  // Only real, user-submitted pet reports should be in the database
  return NextResponse.json({ 
    success: false, 
    error: 'This scraper is disabled. Fake data is not allowed in a lost pet finding application. Only real, user-submitted pet reports are accepted.',
    summary: {
      platforms: [],
      hashtags: HASHTAGS,
      pagesDiscovered: 0,
      petsFound: 0,
      petsSaved: 0,
      duplicatesSkipped: 0,
      errors: 0,
    },
    pages: [],
  }, { status: 403 });
}
