/**
 * Local Attractions API
 * GET /api/activities/local?location=Gulf+Shores&type=indoor&category=museum&badWeather=true
 *
 * Fetches from `local_attractions` table. Falls back to curated seed data if table
 * is empty or doesn't exist yet. Supports filtering by:
 *   - location  (city / area name, partial match)
 *   - type      (indoor | outdoor | both)
 *   - category  (museum, park, restaurant, shopping, entertainment, marine, sports, nightlife)
 *   - badWeather (true → only indoor / both activities for rainy-day fallback)
 *   - limit     (default 20, max 50)
 *
 * Used by Finn concierge and WTV bad-weather integration.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../_lib/supabase';
import { normalizeLocation } from '../_lib/attractions-auto-populate';

// ── Curated seed data (used when DB table is empty) ──────────────────────────
const SEED_ATTRACTIONS = [
  // Gulf Shores / Orange Beach, AL
  { name: 'Gulf Coast Exploreum', description: 'Interactive science museum with hands-on exhibits', price_range: '$', category: 'museum', type: 'indoor', location: 'Gulf Shores', duration: '2-3 hours', website: 'https://www.exploreum.com', lat: 30.6954, lon: -88.0399 },
  { name: 'USS Alabama Battleship', description: 'Historic WWII battleship museum and memorial park', price_range: '$$', category: 'museum', type: 'outdoor', location: 'Gulf Shores', duration: '2-3 hours', website: 'https://www.ussalabama.com', lat: 30.6818, lon: -88.0145 },
  { name: 'Gulf State Park', description: 'Beach activities, hiking trails, nature center, and fishing pier', price_range: '$', category: 'park', type: 'outdoor', location: 'Gulf Shores', duration: 'Full day', website: 'https://www.alapark.com/gulf-state-park', lat: 30.2468, lon: -87.6476 },
  { name: 'The Wharf', description: 'Entertainment district with shopping, dining, and a Ferris wheel', price_range: '$$', category: 'entertainment', type: 'both', location: 'Orange Beach', duration: '3-5 hours', website: 'https://www.alwharf.com', lat: 30.2756, lon: -87.5836 },
  { name: 'Alabama Gulf Coast Zoo', description: 'Zoological park with exotic animals, petting zoo, and shows', price_range: '$$', category: 'entertainment', type: 'outdoor', location: 'Gulf Shores', duration: '2-3 hours', website: 'https://www.alabamagulfcoastzoo.com', lat: 30.2695, lon: -87.6845 },
  { name: 'Tanger Outlets', description: 'Outlet shopping with 120+ brand-name stores', price_range: '$$', category: 'shopping', type: 'indoor', location: 'Gulf Shores', duration: '2-4 hours', website: 'https://www.tangeroutlet.com', lat: 30.2938, lon: -87.6267 },
  { name: 'LuLu\'s at Homeport Marina', description: 'Jimmy Buffett\'s sister\'s waterfront restaurant and entertainment complex', price_range: '$$', category: 'restaurant', type: 'both', location: 'Gulf Shores', duration: '2-3 hours', website: 'https://www.lulubuffett.com', lat: 30.2801, lon: -87.6347 },
  { name: 'Hugh S. Branyon Backcountry Trail', description: '15+ miles of paved trails through coastal forests, wetlands, and dunes', price_range: 'Free', category: 'park', type: 'outdoor', location: 'Gulf Shores', duration: '1-3 hours', website: null, lat: 30.2633, lon: -87.6373 },
  // Destin, FL
  { name: 'Destin History & Fishing Museum', description: 'Maritime heritage museum showcasing Destin\'s fishing history', price_range: '$', category: 'museum', type: 'indoor', location: 'Destin', duration: '1-2 hours', website: 'https://www.destinhistoryandfishingmuseum.org', lat: 30.3935, lon: -86.4958 },
  { name: 'Big Kahuna\'s Water Park', description: 'Major water and adventure park with slides, lazy river, and mini golf', price_range: '$$$', category: 'entertainment', type: 'outdoor', location: 'Destin', duration: 'Full day', website: 'https://www.bigkahunas.com', lat: 30.3896, lon: -86.4638 },
  { name: 'Henderson Beach State Park', description: 'Pristine beach with nature trails and coastal dune habitat', price_range: '$', category: 'park', type: 'outdoor', location: 'Destin', duration: '3-5 hours', website: null, lat: 30.3758, lon: -86.4470 },
  { name: 'Destin Commons', description: 'Open-air shopping and dining center with movie theater and bowling', price_range: '$$', category: 'shopping', type: 'both', location: 'Destin', duration: '2-4 hours', website: 'https://www.destincommons.com', lat: 30.3908, lon: -86.4511 },
  // Panama City Beach, FL
  { name: 'Ripley\'s Believe It or Not!', description: 'Odditorium with interactive exhibits and illusions', price_range: '$$', category: 'museum', type: 'indoor', location: 'Panama City Beach', duration: '1-2 hours', website: 'https://www.ripleys.com', lat: 30.1766, lon: -85.8055 },
  { name: 'Pier Park', description: 'Massive shopping, dining, and entertainment complex on the beach', price_range: '$$', category: 'shopping', type: 'both', location: 'Panama City Beach', duration: '3-5 hours', website: 'https://www.simon.com/mall/pier-park', lat: 30.1773, lon: -85.8119 },
  { name: 'St. Andrews State Park', description: 'Beaches, snorkeling, nature trails, and historic turpentine still', price_range: '$', category: 'park', type: 'outdoor', location: 'Panama City Beach', duration: 'Full day', website: null, lat: 30.1275, lon: -85.7375 },
  { name: 'WonderWorks', description: 'Indoor amusement park with 100+ interactive science exhibits', price_range: '$$', category: 'entertainment', type: 'indoor', location: 'Panama City Beach', duration: '2-3 hours', website: 'https://www.wonderworksonline.com', lat: 30.1766, lon: -85.8055 },
  // Pensacola, FL
  { name: 'National Naval Aviation Museum', description: 'Free museum with 150+ aircraft, IMAX theater, and Blue Angels history', price_range: 'Free', category: 'museum', type: 'indoor', location: 'Pensacola', duration: '3-5 hours', website: 'https://www.navalaviationmuseum.org', lat: 30.3530, lon: -87.2971 },
  { name: 'Pensacola Lighthouse', description: 'Historic 1859 lighthouse with panoramic views and museum', price_range: '$', category: 'museum', type: 'both', location: 'Pensacola', duration: '1-2 hours', website: 'https://www.pensacolalighthouse.org', lat: 30.3463, lon: -87.3080 },
  { name: 'Palafox Market', description: 'Saturday farmers market with local produce, crafts, and food vendors', price_range: '$', category: 'shopping', type: 'outdoor', location: 'Pensacola', duration: '1-2 hours', website: null, lat: 30.4131, lon: -87.2169 },
  { name: 'Sam\'s Fun City', description: 'Family amusement park with rides, mini golf, and arcade', price_range: '$$', category: 'entertainment', type: 'both', location: 'Pensacola', duration: '3-5 hours', website: 'https://www.samsfuncity.com', lat: 30.4590, lon: -87.2375 },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawLocation = String(req.query.location || '').trim();
    const location = normalizeLocation(rawLocation) || rawLocation;
    const type = String(req.query.type || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();
    const badWeather = req.query.badWeather === 'true';
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    // Try DB first
    let attractions: any[] = [];
    let fromDb = false;
    try {
      const admin = getSupabaseAdmin();
      let query = admin
        .from('local_attractions')
        .select('name, description, price_range, category, type, location, duration, website, lat, lon, rating, image_url, referral_url, referral_active')
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('rating', { ascending: false })
        .limit(limit);

      if (location) query = query.ilike('location', `%${location}%`);
      if (type && (type === 'indoor' || type === 'outdoor')) query = query.or(`type.eq.${type},type.eq.both`);
      if (badWeather) query = query.or('type.eq.indoor,type.eq.both');
      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        attractions = data;
        fromDb = true;
      }
    } catch {
      // Table may not exist yet — fall through to seed data
    }

    // Fallback to curated seed data
    if (!fromDb) {
      attractions = SEED_ATTRACTIONS.filter((a) => {
        if (location && !a.location.toLowerCase().includes(location.toLowerCase()) &&
          !normalizeLocation(a.location).toLowerCase().includes(location.toLowerCase())) return false;
        if (type && type !== 'both' && a.type !== type && a.type !== 'both') return false;
        if (badWeather && a.type === 'outdoor') return false;
        if (category && a.category !== category) return false;
        return true;
      }).slice(0, limit);
    }

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({
      attractions,
      count: attractions.length,
      source: fromDb ? 'database' : 'curated',
      filters: { location: location || null, type: type || null, category: category || null, badWeather },
    });
  } catch (error: any) {
    console.error('Error fetching attractions:', error);
    return res.status(500).json({ error: 'Failed to fetch attractions' });
  }
}
