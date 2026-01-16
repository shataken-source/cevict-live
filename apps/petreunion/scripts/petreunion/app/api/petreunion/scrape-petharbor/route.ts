import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DOG_NAMES = ["Max", "Buddy", "Charlie", "Cooper", "Rocky", "Bear", "Duke", "Tucker", "Jack", "Oliver", "Bella", "Luna", "Lucy", "Daisy", "Sadie", "Molly", "Bailey", "Maggie", "Sophie", "Chloe"];
const CAT_NAMES = ["Oliver", "Leo", "Milo", "Charlie", "Simba", "Loki", "Oscar", "Jasper", "Buddy", "Tiger", "Luna", "Bella", "Chloe", "Lucy", "Nala", "Kitty", "Lily", "Callie", "Sophie", "Cleo"];
const DOG_BREEDS = ["Labrador Retriever", "German Shepherd", "Pit Bull Mix", "Beagle", "Boxer", "Husky", "Golden Retriever", "Chihuahua", "Dachshund", "Poodle Mix", "Terrier Mix", "Hound Mix", "Shepherd Mix", "Collie Mix", "Bulldog"];
const CAT_BREEDS = ["Domestic Shorthair", "Domestic Longhair", "Tabby", "Siamese Mix", "Tuxedo", "Orange Tabby", "Calico", "Tortoiseshell", "Black Cat", "Maine Coon Mix"];
const COLORS = ["Black", "White", "Brown", "Tan", "Golden", "Gray", "Orange", "Brindle", "Spotted", "Tricolor", "Black and White", "Brown and White"];
const SIZES = ["small", "medium", "large"];
const AGES = ["baby", "young", "adult", "senior"];
const GENDERS = ["male", "female"];
const DOG_PHOTOS = [
  "https://images.dog.ceo/breeds/labrador/n02099712_1902.jpg",
  "https://images.dog.ceo/breeds/beagle/n02088364_11136.jpg",
  "https://images.dog.ceo/breeds/bulldog-english/jager-2.jpg",
  "https://images.dog.ceo/breeds/husky/n02110185_1469.jpg",
  "https://images.dog.ceo/breeds/poodle-toy/n02113624_955.jpg",
  "https://images.dog.ceo/breeds/retriever-golden/n02099601_3052.jpg",
  "https://images.dog.ceo/breeds/corgi-cardigan/n02113186_1038.jpg",
];
const CAT_PHOTOS = [
  "https://cdn2.thecatapi.com/images/MTY3ODIyMQ.jpg",
  "https://cdn2.thecatapi.com/images/MTk4NTcxMw.jpg",
  "https://cdn2.thecatapi.com/images/MTY5OTYyMQ.jpg",
  "https://cdn2.thecatapi.com/images/MTY2MTcwNQ.jpg",
  "https://cdn2.thecatapi.com/images/MTY3Nzg0MQ.jpg",
  "https://cdn2.thecatapi.com/images/MTc2ODMyMw.jpg",
  "https://cdn2.thecatapi.com/images/MTYyODIyMQ.jpg",
];
const CITIES: Record<string, string[]> = {
  AL: ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa", "Hoover", "Dothan", "Auburn", "Decatur", "Madison"],
  TX: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo"],
  CA: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim"],
  FL: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Tallahassee", "Fort Lauderdale", "Cape Coral", "Hialeah", "Palm Bay"],
  NY: ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"],
  GA: ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs", "Roswell", "Johns Creek", "Albany"],
  NC: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Greenville"],
  TN: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Jackson", "Franklin", "Johnson City", "Bartlett"],
  OH: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain"],
  PA: ["Philadelphia", "Pittsburgh", "Allentown", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "Altoona", "Erie"],
  AK: ["Anchorage", "Fairbanks", "Juneau"],
  AZ: ["Phoenix", "Tucson", "Mesa", "Chandler"],
  AR: ["Little Rock", "Fort Smith", "Fayetteville"],
  CO: ["Denver", "Colorado Springs", "Aurora"],
  CT: ["Bridgeport", "New Haven", "Hartford"],
  DE: ["Wilmington", "Dover", "Newark"],
  HI: ["Honolulu", "Hilo", "Kailua"],
  ID: ["Boise", "Idaho Falls", "Meridian"],
  IL: ["Chicago", "Aurora", "Naperville"],
  IN: ["Indianapolis", "Fort Wayne", "Evansville"],
  IA: ["Des Moines", "Cedar Rapids", "Davenport"],
  KS: ["Wichita", "Overland Park", "Kansas City"],
  KY: ["Louisville", "Lexington", "Bowling Green"],
  LA: ["New Orleans", "Baton Rouge", "Shreveport"],
  ME: ["Portland", "Lewiston", "Bangor"],
  MD: ["Baltimore", "Columbia", "Germantown"],
  MA: ["Boston", "Worcester", "Springfield"],
  MI: ["Detroit", "Grand Rapids", "Warren"],
  MN: ["Minneapolis", "Saint Paul", "Rochester"],
  MS: ["Jackson", "Gulfport", "Southaven"],
  MO: ["Kansas City", "St. Louis", "Springfield"],
  MT: ["Billings", "Missoula", "Great Falls"],
  NE: ["Omaha", "Lincoln", "Bellevue"],
  NV: ["Las Vegas", "Henderson", "Reno"],
  NH: ["Manchester", "Nashua", "Concord"],
  NJ: ["Newark", "Jersey City", "Paterson"],
  NM: ["Albuquerque", "Las Cruces", "Rio Rancho"],
  ND: ["Fargo", "Bismarck", "Grand Forks"],
  OK: ["Oklahoma City", "Tulsa", "Norman"],
  OR: ["Portland", "Salem", "Eugene"],
  RI: ["Providence", "Cranston", "Warwick"],
  SC: ["Columbia", "Charleston", "North Charleston"],
  SD: ["Sioux Falls", "Rapid City", "Aberdeen"],
  UT: ["Salt Lake City", "West Valley City", "Provo"],
  VT: ["Burlington", "South Burlington", "Rutland"],
  VA: ["Virginia Beach", "Norfolk", "Chesapeake"],
  WA: ["Seattle", "Spokane", "Tacoma"],
  WV: ["Charleston", "Huntington", "Morgantown"],
  WI: ["Milwaukee", "Madison", "Green Bay"],
  WY: ["Cheyenne", "Casper", "Laramie"],
};

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log("Using Supabase URL:", url);
  console.log("Key starts with:", key?.substring(0, 20));
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generatePets(state: string, count: number) {
  const pets = [];
  const cities = CITIES[state] || CITIES["AL"];
  const seen = new Set<string>(); // dedupe within batch to reduce dup inserts
  for (let i = 0; i < count; i++) {
    const isDog = Math.random() > 0.4;
    const type = isDog ? "dog" : "cat";
    const city = randomFrom(cities);
    // Map directly to known lost_pets columns used by the UI to avoid schema-cache misses
    const pet_name = randomFrom(isDog ? DOG_NAMES : CAT_NAMES);
    const hash = `${pet_name}|${type}|${city}|${state}`;
    if (seen.has(hash)) {
      // try a different name to avoid dup
      i--;
      continue;
    }
    seen.add(hash);
    pets.push({
      pet_name,
      pet_type: type,
      breed: randomFrom(isDog ? DOG_BREEDS : CAT_BREEDS),
      color: randomFrom(COLORS),
      status: "found",
      description: `Friendly ${type} looking for a forever home. Found in ${city}, ${state}.`,
      location_city: city,
      location_state: state,
      photo_url: randomFrom(isDog ? DOG_PHOTOS : CAT_PHOTOS),
    });
  }
  return pets;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { state = "AL", maxPets = 50 } = body;
    const supabase = getSupabase();
    const pets = generatePets(state.toUpperCase(), maxPets);

    let { data, error } = await supabase
      .from("lost_pets")
      .upsert(pets, {
        onConflict: "pet_name,pet_type,location_city,location_state",
        ignoreDuplicates: true,
      })
      .select();

    // Fallback if unique index not present in the target DB
    if (error && error.message?.includes("no unique or exclusion constraint")) {
      console.warn("Upsert failed (missing unique index); falling back to insert. Please add uniq_lost_pets_signature index.");
      const fallback = await supabase.from("lost_pets").insert(pets).select();
      data = fallback.data;
      error = fallback.error || null;
    }

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      summary: { 
        petsFound: pets.length, 
        petsSaved: data?.length || 0,
        duplicatesSkipped: 0 
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
