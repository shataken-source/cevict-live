import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type BulkInput = {
  pages?: string[];
  maxShelters?: number;
  maxPetsPerShelter?: number;
  maxPosts?: number;
};

type ScrapeCounts = {
  petsFound: number;
  petsSaved: number;
  errors: string[];
};

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || '';
const DEFAULT_PAGES = (process.env.FACEBOOK_SHELTER_PAGES || '').split(',').map((s) => s.trim()).filter(Boolean);

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials');
  return createClient(supabaseUrl, supabaseKey);
}

async function getFacebookToken(): Promise<string> {
  if (FACEBOOK_ACCESS_TOKEN) return FACEBOOK_ACCESS_TOKEN;
  if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&grant_type=client_credentials`
    );
    const data = await res.json();
    if (data?.access_token) return data.access_token;
    throw new Error(data?.error?.message || 'Unable to fetch Facebook app token');
  }
  throw new Error('Missing FACEBOOK_ACCESS_TOKEN or (FACEBOOK_APP_ID + FACEBOOK_APP_SECRET)');
}

function parsePageIdFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!url.hostname.includes('facebook.com')) return null;
    const path = url.pathname.replace(/\/+$/, '');
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    if (parts[0] === 'pages' && parts.length >= 3) return parts[2];
    if (parts[0] === 'groups' && parts[1]) return parts[1];
    return parts[0];
  } catch {
    return null;
  }
}

function extractPetFromPost(post: any, pageUrl: string) {
  const message: string = post?.message || '';
  const lower = message.toLowerCase();
  const keywords = ['dog', 'cat', 'puppy', 'kitten', 'lost', 'missing', 'found', 'adopt', 'rescue', 'shelter'];
  if (!keywords.some((k) => lower.includes(k))) return null;

  const petType: 'dog' | 'cat' | 'other' =
    lower.includes('cat') || lower.includes('kitten') ? 'cat' : lower.includes('dog') || lower.includes('puppy') ? 'dog' : 'other';
  const status: 'lost' | 'found' =
    lower.includes('lost') || lower.includes('missing') ? 'lost' : 'found';

  const photo =
    post?.full_picture ||
    post?.attachments?.data?.flatMap((a: any) => [
      a?.media?.image?.src,
      ...(a?.subattachments?.data?.map((s: any) => s?.media?.image?.src) || []),
    ]).find(Boolean) ||
    null;

  let location_city = post?.place?.location?.city || '';
  let location_state = post?.place?.location?.state || '';

  const locMatch = message.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+([A-Z]{2})/);
  if (!location_city && locMatch) {
    location_city = locMatch[1];
    location_state = locMatch[2];
  }

  const sourceId = post?.id ? `fb_${post.id}` : undefined;
  if (!sourceId) return null;

  return {
    pet_name: 'Pet',
    pet_type: petType === 'other' ? 'dog' : petType,
    breed: 'Mixed',
    color: null,
    status,
    size: null,
    age: null,
    gender: 'unknown',
    description: message.slice(0, 500),
    date_found: new Date(post?.created_time || Date.now()).toISOString(),
    location_city: location_city || null,
    location_state: location_state || null,
    photo_url: photo,
    source: 'facebook',
    source_id: sourceId,
    source_url: post?.permalink_url || pageUrl,
  };
}

async function fetchPostsForPage(pageId: string, token: string, maxPosts: number) {
  const url = `https://graph.facebook.com/v19.0/${pageId}/feed?access_token=${token}&limit=${maxPosts}&fields=id,message,created_time,full_picture,permalink_url,place,attachments{subattachments{media{image{src}}},media{image{src}}}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data?.error) {
    throw new Error(data.error?.message || 'Facebook feed error');
  }
  return Array.isArray(data?.data) ? data.data : [];
}

async function savePets(pets: any[]) {
  if (!pets.length) return { found: 0, saved: 0 };
  const supabase = getSupabase();
  const ids = pets.map((p) => p.source_id);
  const { data: existing } = await supabase.from('lost_pets').select('source_id').in('source_id', ids);
  const existingIds = new Set((existing || []).map((r: any) => r.source_id));
  const newPets = pets.filter((p) => !existingIds.has(p.source_id));
  if (newPets.length > 0) {
    const { error } = await supabase.from('lost_pets').insert(newPets);
    if (error) throw new Error(error.message);
  }
  return { found: pets.length, saved: newPets.length };
}

async function handlePage(url: string, token: string, maxPosts: number): Promise<ScrapeCounts> {
  const pageId = parsePageIdFromUrl(url);
  if (!pageId) return { petsFound: 0, petsSaved: 0, errors: [`Could not parse page id from ${url}`] };

  try {
    const posts = await fetchPostsForPage(pageId, token, maxPosts);
    const pets = posts
      .map((p: any) => extractPetFromPost(p, url))
      .filter(Boolean) as any[];
    const counts = await savePets(pets);
    return { petsFound: counts.found, petsSaved: counts.saved, errors: [] };
  } catch (err: any) {
    return { petsFound: 0, petsSaved: 0, errors: [err?.message || 'Unknown Facebook error'] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as BulkInput;
    const maxShelters = Math.max(1, Math.min(body.maxShelters || 50, 200));
    const maxPetsPerShelter = Math.max(5, Math.min(body.maxPetsPerShelter || 50, 200));
    const maxPosts = Math.max(5, Math.min(body.maxPosts || maxPetsPerShelter, 100));

    const requestedPages = (body.pages || []).filter((p) => typeof p === 'string' && p.includes('facebook.com'));
    const pages = (requestedPages.length ? requestedPages : DEFAULT_PAGES).slice(0, maxShelters);

    if (!pages.length) {
      return NextResponse.json(
        { success: false, error: 'No Facebook pages provided. Pass pages[] or set FACEBOOK_SHELTER_PAGES.' },
        { status: 400 }
      );
    }

    const token = await getFacebookToken();

    let totalFound = 0;
    let totalSaved = 0;
    const errors: string[] = [];

    for (const page of pages) {
      const result = await handlePage(page, token, maxPosts);
      totalFound += result.petsFound;
      totalSaved += result.petsSaved;
      errors.push(...result.errors);
    }

    return NextResponse.json({
      success: true,
      summary: {
        petsFound: totalFound,
        petsSaved: totalSaved,
        pagesProcessed: pages.length,
      },
      errors,
      message: 'Facebook bulk scrape completed',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to start Facebook bulk scrape' },
      { status: 500 }
    );
  }
}

