import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Mode = "simulate" | "api";

type Shelter = {
  id: string;
  name: string;
  city: string;
  state: string;
  pageId: string;
  url: string;
};

type ScrapeRequest = {
  states?: string[];
  petsPerShelter?: number;
  mode?: Mode;
  saveToDatabase?: boolean;
  accessToken?: string; // for api mode
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

const sheltersByState: Record<string, Shelter[]> = {
  AL: [
    { id: "al01", name: "Greater Birmingham Humane Society", city: "Birmingham", state: "AL", pageId: "GBHSpets", url: "https://www.facebook.com/GBHSpets" },
    { id: "al02", name: "Huntsville Animal Services", city: "Huntsville", state: "AL", pageId: "HuntsvilleAnimalServices", url: "https://www.facebook.com/HuntsvilleAnimalServices" },
    { id: "al03", name: "Mobile SPCA", city: "Mobile", state: "AL", pageId: "MobileSPCA", url: "https://www.facebook.com/MobileSPCA" },
    { id: "al04", name: "Montgomery Humane Society", city: "Montgomery", state: "AL", pageId: "MontgomeryHumane", url: "https://www.facebook.com/MontgomeryHumane" },
    { id: "al05", name: "Tuscaloosa Metro Animal Shelter", city: "Tuscaloosa", state: "AL", pageId: "MetroAnimalShelter", url: "https://www.facebook.com/MetroAnimalShelter" },
    { id: "al06", name: "Auburn Opelika Humane Society", city: "Auburn", state: "AL", pageId: "LeeCountyHS", url: "https://www.facebook.com/LeeCountyHS" },
  ],
  TX: [
    { id: "tx01", name: "Houston SPCA", city: "Houston", state: "TX", pageId: "houstonspca", url: "https://www.facebook.com/houstonspca" },
    { id: "tx02", name: "Austin Pets Alive", city: "Austin", state: "TX", pageId: "AustinPetsAlive", url: "https://www.facebook.com/AustinPetsAlive" },
    { id: "tx03", name: "Dallas Animal Services", city: "Dallas", state: "TX", pageId: "DallasAnimalServices", url: "https://www.facebook.com/DallasAnimalServices" },
    { id: "tx04", name: "San Antonio ACS", city: "San Antonio", state: "TX", pageId: "SanAntonioACS", url: "https://www.facebook.com/SanAntonioACS" },
    { id: "tx05", name: "Fort Worth Animal Care", city: "Fort Worth", state: "TX", pageId: "FortWorthAnimalCare", url: "https://www.facebook.com/FortWorthAnimalCare" },
  ],
  CA: [
    { id: "ca01", name: "LA Animal Services", city: "Los Angeles", state: "CA", pageId: "laanimalservices", url: "https://www.facebook.com/laanimalservices" },
    { id: "ca02", name: "San Diego Humane Society", city: "San Diego", state: "CA", pageId: "sdhumane", url: "https://www.facebook.com/sdhumane" },
    { id: "ca03", name: "SF SPCA", city: "San Francisco", state: "CA", pageId: "sanfranciscospca", url: "https://www.facebook.com/sanfranciscospca" },
    { id: "ca04", name: "Sacramento SPCA", city: "Sacramento", state: "CA", pageId: "SacSPCA", url: "https://www.facebook.com/SacSPCA" },
  ],
  FL: [
    { id: "fl01", name: "Miami-Dade Animal Services", city: "Miami", state: "FL", pageId: "adoptmiamipets", url: "https://www.facebook.com/adoptmiamipets" },
    { id: "fl02", name: "Jacksonville Humane Society", city: "Jacksonville", state: "FL", pageId: "jaxhumane", url: "https://www.facebook.com/jaxhumane" },
    { id: "fl03", name: "Tampa Humane Society", city: "Tampa", state: "FL", pageId: "HumaneSocietyTampaBay", url: "https://www.facebook.com/HumaneSocietyTampaBay" },
    { id: "fl04", name: "Orlando Pet Alliance", city: "Orlando", state: "FL", pageId: "PetAlliance", url: "https://www.facebook.com/PetAlliance" },
  ],
  NY: [
    { id: "ny01", name: "Animal Care Centers of NYC", city: "New York", state: "NY", pageId: "NYCACC", url: "https://www.facebook.com/NYCACC" },
    { id: "ny02", name: "Buffalo Animal Shelter", city: "Buffalo", state: "NY", pageId: "FriendsOfBuffaloAnimalShelter", url: "https://www.facebook.com/FriendsOfBuffaloAnimalShelter" },
    { id: "ny03", name: "Lollypop Farm", city: "Rochester", state: "NY", pageId: "LollypopFarm", url: "https://www.facebook.com/LollypopFarm" },
  ],
  GA: [
    { id: "ga01", name: "Atlanta Humane Society", city: "Atlanta", state: "GA", pageId: "atlantahumane", url: "https://www.facebook.com/atlantahumane" },
    { id: "ga02", name: "Fulton County Animal Services", city: "Atlanta", state: "GA", pageId: "FultonAnimalServices", url: "https://www.facebook.com/FultonAnimalServices" },
    { id: "ga03", name: "Savannah Humane", city: "Savannah", state: "GA", pageId: "SavannahHumane", url: "https://www.facebook.com/SavannahHumane" },
  ],
};

const PET_NAMES = ["Buddy", "Luna", "Bella", "Max", "Charlie", "Lucy", "Rocky", "Daisy", "Milo", "Sadie", "Bailey", "Cooper"];
const BREEDS = ["Mixed", "Labrador", "Shepherd", "Pit Bull Mix", "Husky", "Beagle", "Boxer", "Tabby", "Domestic Shorthair"];
const COLORS = ["Brown", "Black", "White", "Gray", "Tan", "Brindle", "Orange", "Calico"];
const SIZES = ["small", "medium", "large"];
const GENDERS = ["male", "female", "unknown"];

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function simulatePets(shelter: Shelter, count: number): PetRecord[] {
  const pets: PetRecord[] = [];
  for (let i = 0; i < count; i++) {
    const petType = Math.random() > 0.35 ? "dog" : "cat";
    const name = randomItem(PET_NAMES);
    const breed = randomItem(BREEDS);
    const color = randomItem(COLORS);
    const size = randomItem(SIZES);
    const gender = randomItem(GENDERS);
    const source_post_id = `sim_${shelter.id}_${i}`;
    const description = `${petType === "dog" ? "Dog" : "Cat"} seen near ${shelter.city}, ${shelter.state}. ${color} ${breed}.`;
    pets.push({
      pet_name: name,
      pet_type: petType,
      breed,
      color,
      size,
      age: null,
      gender,
      status: "found",
      location_city: shelter.city,
      location_state: shelter.state,
      description,
      photo_url: null,
      source_platform: "facebook",
      source_url: shelter.url,
      source_post_id,
      shelter_name: shelter.name,
    });
  }
  return pets;
}

function extractFromMessage(message: string): Partial<PetRecord> {
  const lower = message.toLowerCase();

  const petType = lower.includes("cat") || lower.includes("kitten") ? "cat" : "dog";
  const breedMatch = message.match(/\b(Lab|Labrador|Shepherd|Husky|Beagle|Boxer|Pit|Pitbull|Tabby|Calico|Bulldog|Poodle|Doodle)\b/i);
  const colorMatch = message.match(/\b(black|white|brown|tan|gray|grey|brindle|orange|calico)\b/i);
  const sizeMatch = message.match(/\b(small|medium|large|xl|giant)\b/i);
  const ageMatch = message.match(/\b(\d{1,2})\s*(yr|yrs|year|years|mo|mos|month|months|week|weeks)\b/i);
  const genderMatch = message.match(/\b(male|female|boy|girl|neutered|spayed)\b/i);
  const cityStateMatch = message.match(/([A-Z][a-zA-Z]+)[,\s]+([A-Z]{2})/);

  let gender: string | null = null;
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    gender = g.includes("male") || g.includes("boy") ? "male" : g.includes("female") || g.includes("girl") ? "female" : "unknown";
  }

  return {
    pet_type: petType,
    breed: breedMatch?.[0] || null,
    color: colorMatch?.[0] ? colorMatch[0][0].toUpperCase() + colorMatch[0].slice(1) : null,
    size: sizeMatch?.[0]?.toLowerCase() || null,
    age: ageMatch?.[0] || null,
    gender,
    location_city: cityStateMatch?.[1] || null,
    location_state: cityStateMatch?.[2] || null,
  };
}

async function fetchPostsForPage(pageId: string, token: string, limit: number) {
  const url = `https://graph.facebook.com/v19.0/${pageId}/posts?access_token=${token}&limit=${limit}&fields=id,message,created_time,permalink_url,full_picture,place`;
  const res = await fetch(url);
  const data = await res.json();
  if (data?.error) {
    throw new Error(data.error?.message || "Facebook API error");
  }
  return Array.isArray(data?.data) ? data.data : [];
}

function mapPostToPet(post: any, shelter: Shelter): PetRecord | null {
  const message: string = post?.message || "";
  const partial = extractFromMessage(message);
  const source_post_id = post?.id ? `fb_${post.id}` : null;
  if (!source_post_id) return null;

  return {
    pet_name: "Pet",
    pet_type: partial.pet_type || "dog",
    breed: partial.breed || "Mixed",
    color: partial.color ?? null,
    size: partial.size ?? null,
    age: partial.age ?? null,
    gender: partial.gender || "unknown",
    status: "found",
    location_city: partial.location_city || shelter.city,
    location_state: partial.location_state || shelter.state,
    description: message.slice(0, 500) || null,
    photo_url: post?.full_picture || null,
    source_platform: "facebook",
    source_url: post?.permalink_url || shelter.url,
    source_post_id,
    shelter_name: shelter.name,
  };
}

async function savePets(pets: PetRecord[]) {
  if (!pets.length) return { inserted: 0, skipped: 0 };
  const supabase = getSupabase();
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
    const states = (body.states || ["AL"]).map((s) => s.toUpperCase());
    const petsPerShelter = Math.max(1, Math.min(body.petsPerShelter || 5, 50));
    const mode: Mode = body.mode === "api" ? "api" : "simulate";
    const saveToDatabase = body.saveToDatabase !== false; // default true
    const accessToken = body.accessToken || process.env.FACEBOOK_ACCESS_TOKEN;

    const shelters: Shelter[] = [];
    for (const s of states) {
      if (sheltersByState[s]) shelters.push(...sheltersByState[s]);
    }
    if (!shelters.length) {
      return NextResponse.json({ success: false, error: "No shelters for requested states" }, { status: 400 });
    }

    const allPets: PetRecord[] = [];
    const errors: string[] = [];

    if (mode === "simulate") {
      for (const shelter of shelters) {
        allPets.push(...simulatePets(shelter, petsPerShelter));
      }
    } else {
      if (!accessToken) {
        return NextResponse.json({ success: false, error: "Missing Facebook access token for api mode" }, { status: 400 });
      }
      for (const shelter of shelters) {
        try {
          const posts = await fetchPostsForPage(shelter.pageId, accessToken, petsPerShelter);
          const pets = posts
            .map((p: any) => mapPostToPet(p, shelter))
            .filter(Boolean) as PetRecord[];
          allPets.push(...pets);
        } catch (err: any) {
          errors.push(`${shelter.name}: ${err?.message || "facebook error"}`);
        }
      }
    }

    let inserted = 0;
    let skipped = 0;
    if (saveToDatabase && allPets.length) {
      const result = await savePets(allPets);
      inserted = result.inserted;
      skipped = result.skipped;
    }

    return NextResponse.json({
      success: true,
      summary: {
        sheltersProcessed: shelters.length,
        petsFound: allPets.length,
        petsSaved: inserted,
        duplicatesSkipped: skipped,
      },
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Scrape failed" }, { status: 500 });
  }
}
