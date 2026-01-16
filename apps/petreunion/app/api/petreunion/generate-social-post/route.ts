import { NextRequest, NextResponse } from 'next/server';
import { toDatabaseNotConfiguredResponse, toServiceUnavailableResponse } from '@/lib/api-error';

type Platform = 'facebook' | 'x' | 'instagram' | 'nextdoor';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3007';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function cleanTextBasic(s: string): string {
  let out = (s || '').trim();
  if (!out) return '';
  // Remove noisy bracket blocks
  out = out.replace(/\[CONTINUOUS SEARCH:[^\]]+\]/gi, '').trim();
  // Normalize whitespace
  out = out.replace(/\s+/g, ' ');

  // A few high-value common typos we’ve seen in reports (conservative)
  const replacements: Array<[RegExp, string]> = [
    [/\bsuoer\b/gi, 'super'],
    [/\bcommnds\b/gi, 'commands'],
    [/\bther\b/gi, 'other'],
    [/\bike\b/gi, 'like'],
    [/\boangeish\b/gi, 'orangish'],
    [/\bobeys\b/gi, 'obeys'],
  ];
  for (const [re, rep] of replacements) out = out.replace(re, rep);

  return out;
}

async function tryOpenAiFixTypos(text: string): Promise<string | null> {
  const mode = (process.env.PETREUNION_TYPO_FIX_MODE || 'basic').toLowerCase();
  if (mode !== 'openai') return null;

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) return null;

  // Keep it short to avoid cost/latency. Do NOT hallucinate new facts.
  const prompt = `Fix spelling/grammar in this lost-pet description while preserving meaning.
Rules:
- Do NOT add new details.
- Keep it 1 paragraph.
- Keep proper nouns as-is.
Return JSON only: { "text": "..." }`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nTEXT:\n${text}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!resp.ok) return null;
    const json: any = await resp.json();
    const content = json?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content);
    const cleaned = String(parsed?.text || '').trim();
    return cleaned || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function clampLen(s: string, max: number) {
  const t = (s || '').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString();
}

function buildHashtags(petType: string, city?: string, state?: string) {
  const safe = (s: string) => s.replace(/[^a-z0-9]/gi, '');
  const tags = [
    '#LostPet',
    petType.toLowerCase().includes('cat') ? '#LostCat' : '#LostDog',
    '#PetReunion',
    city ? `#${safe(city)}` : null,
    state ? `#${safe(state)}` : null,
  ].filter(Boolean) as string[];
  return Array.from(new Set(tags));
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) return toDatabaseNotConfiguredResponse();

    const body = (await request.json().catch(() => ({}))) as { petId?: string; platforms?: Platform[]; debug?: boolean };
    const petId = String(body.petId || '').trim();
    if (!petId) return NextResponse.json({ success: false, error: 'petId is required' }, { status: 400 });
    if (!isUuid(petId)) return NextResponse.json({ success: false, error: 'petId must be a UUID' }, { status: 400 });

    const platforms = (Array.isArray(body.platforms) ? body.platforms : ['facebook', 'x', 'instagram']).filter(Boolean) as Platform[];
    const wanted = new Set(platforms);
    const includeDetails = Boolean(body.debug) && process.env.NODE_ENV !== 'production';

    const baseUrl = getBaseUrl(request);
    const listingUrl = `${baseUrl}/pets/${encodeURIComponent(petId)}`;

    const qs = new URLSearchParams();
    // Schema-safe: avoid selecting columns that may not exist across environments (e.g. `date_found`)
    qs.set('select', '*');
    qs.set('id', `eq.${petId}`);
    qs.set('limit', '1');
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${qs.toString()}`;

    const res = await fetch(url, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      const status = res.status === 404 ? 404 : 500;
      return NextResponse.json(
        { success: false, error: status === 404 ? 'Pet not found' : 'Failed to load pet', ...(includeDetails ? { details } : {}) },
        { status }
      );
    }

    const rows = (await res.json().catch(() => [])) as any[];
    const pet = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!pet) return NextResponse.json({ success: false, error: 'Pet not found' }, { status: 404 });

    const petName = String(pet.pet_name || 'Unknown').trim() || 'Unknown';
    const petType = String(pet.pet_type || 'pet').trim();
    const breed = String(pet.breed || '').trim();
    const color = String(pet.color || '').trim();
    const city = String(pet.location_city || '').trim();
    const state = String(pet.location_state || '').trim();
    const date = formatDate(pet.date_lost || pet.date_last_seen || pet.date_found || pet.created_at);

    let desc = cleanTextBasic(String(pet.description || ''));
    // Try OpenAI typo-fix if enabled
    const openAi = await tryOpenAiFixTypos(desc);
    if (openAi) desc = openAi;
    desc = clampLen(desc, 420);

    const hashtags = buildHashtags(petType, city, state);
    const photoHint = pet.photo_url ? '📸 Photo in listing' : '';

    const headline = `🚨 LOST ${petType.toUpperCase()} ALERT 🚨`;
    const core = [
      `${petName}${breed ? ` (${breed})` : ''}`,
      color ? `Color: ${color}` : null,
      date ? `Last seen: ${city}${state ? `, ${state}` : ''} • ${date}` : `Last seen: ${city}${state ? `, ${state}` : ''}`,
      desc ? `Info: ${desc}` : null,
      `View details / contact: ${listingUrl}`,
      photoHint || null,
    ].filter(Boolean) as string[];

    const baseText = `${headline}\n\n${core.join('\n')}\n\n${hashtags.join(' ')}`.trim();

    const perPlatform: Record<string, any> = {};
    if (wanted.has('facebook')) {
      perPlatform.facebook = {
        text: baseText,
        shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}&quote=${encodeURIComponent(
          baseText
        )}`,
      };
    }
    if (wanted.has('x')) {
      const xText = clampLen(baseText.replace(/\n+/g, ' '), 260); // leave room
      perPlatform.x = {
        text: xText,
        shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`,
      };
    }
    if (wanted.has('instagram')) {
      // Instagram doesn't support prefilled web share; give a caption to copy.
      perPlatform.instagram = {
        text: baseText,
        instructions: 'Copy the caption, then paste into Instagram with the pet photo (or screenshot the flyer).',
      };
    }
    if (wanted.has('nextdoor')) {
      perPlatform.nextdoor = {
        text: baseText,
        instructions: 'Copy the post text and paste into Nextdoor with the pet photo (or screenshot the flyer).',
      };
    }

    return NextResponse.json({
      success: true,
      pet: {
        id: pet.id,
        pet_name: petName,
        pet_type: petType,
        location_city: city,
        location_state: state,
        photo_url: pet.photo_url || null,
        status: pet.status,
      },
      listingUrl,
      hashtags,
      text: baseText,
      perPlatform,
      typoFix: {
        mode: (process.env.PETREUNION_TYPO_FIX_MODE || 'basic').toLowerCase(),
        usedOpenAI: Boolean(openAi),
      },
      privacy: {
        contactInfoIncluded: false,
      },
    });
  } catch (error: any) {
    return (
      toServiceUnavailableResponse(error) ||
      NextResponse.json({ success: false, error: error?.message || 'Failed to generate post' }, { status: 500 })
    );
  }
}

