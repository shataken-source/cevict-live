import { NextRequest, NextResponse } from "next/server";
import { insertPetsSafely, PetToInsert } from "@/lib/scraper-utils";

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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getSupabaseClient } from '@/lib/supabase-client';

function getSupabase() {
  return getSupabaseClient();
}

function randomFrom<T>(arr: T[]): T { 
  return arr[Math.floor(Math.random() * arr.length)]; 
}

function generatePets(state: string, count: number): PetToInsert[] {
  const pets: PetToInsert[] = [];
  // If state doesn't exist in CITIES, use AL cities and AL state
  const actualState = CITIES[state] ? state : "AL";
  const cities = CITIES[actualState] || CITIES["AL"];
  const seen = new Set<string>(); // dedupe within batch to reduce dup inserts
  
  for (let i = 0; i < count; i++) {
    const isDog = Math.random() > 0.4;
    const type = isDog ? "dog" : "cat";
    const city = randomFrom(cities);
    const pet_name = randomFrom(isDog ? DOG_NAMES : CAT_NAMES);
    const hash = `${pet_name}|${type}|${city}|${actualState}`;
    
    if (seen.has(hash)) {
      // try a different name to avoid dup within batch
      i--;
      continue;
    }
    seen.add(hash);
    
    pets.push({
      pet_name,
      pet_type: type,
      breed: randomFrom(isDog ? DOG_BREEDS : CAT_BREEDS),
      color: randomFrom(COLORS),
      size: randomFrom(SIZES),
      age: randomFrom(AGES),
      gender: randomFrom(GENDERS),
      status: "found",
      description: `Friendly ${type} looking for a forever home. Found in ${city}, ${actualState}.`,
      location_city: city,
      location_state: actualState,
      photo_url: randomFrom(isDog ? DOG_PHOTOS : CAT_PHOTOS),
      owner_name: 'Community',
      date_lost: null,
      date_found: new Date().toISOString().split('T')[0],
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
      petsFound: 0, 
      petsSaved: 0,
      duplicatesSkipped: 0,
      errors: 0
    } 
  }, { status: 403 });
}
