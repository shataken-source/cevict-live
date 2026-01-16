import { toDatabaseNotConfiguredResponse, toServiceUnavailableResponse } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { validatePetPhotoInput } from '@/lib/photo-validation';
import { parseLocationInput } from '@/lib/location-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type PetType = 'dog' | 'cat';

type ReportFoundPetBody = {
  found_pet_name?: string;
  species?: string;
  pet_type?: PetType;
  breed?: string;
  color?: string;
  size?: string;
  age?: string;
  distinctive_features?: string;
  description?: string;
  medical_needs?: string;
  temperament?: string;

  found_date?: string;
  date_found?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  location_detail?: string;

  finder_name?: string;
  finder_email?: string;
  finder_phone?: string;

  photo_url?: string;
};

function normalizePetType(body: ReportFoundPetBody): PetType | null {
  if (body.pet_type === 'dog' || body.pet_type === 'cat') return body.pet_type;

  const species = (body.species || '').toLowerCase().trim();
  if (species === 'dog') return 'dog';
  if (species === 'cat') return 'cat';

  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return toDatabaseNotConfiguredResponse();
    }

    // Handle both FormData and JSON
    let body: ReportFoundPetBody;
    let photoWarning: string | null = null;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        found_pet_name: formData.get('found_pet_name') as string || undefined,
        species: formData.get('species') as string || undefined,
        pet_type: (formData.get('pet_type') as string || undefined) as PetType | undefined,
        breed: formData.get('breed') as string || undefined,
        color: formData.get('color') as string || undefined,
        size: formData.get('size') as string || undefined,
        age: formData.get('age') as string || undefined,
        distinctive_features: formData.get('distinctive_features') as string || undefined,
        description: formData.get('description') as string || undefined,
        medical_needs: formData.get('medical_needs') as string || undefined,
        temperament: formData.get('temperament') as string || undefined,
        found_date: formData.get('found_date') as string || undefined,
        date_found: formData.get('date_found') as string || undefined,
        location_city: formData.get('location_city') as string || undefined,
        location_state: formData.get('location_state') as string || undefined,
        location_detail: formData.get('location_detail') as string || undefined,
        finder_name: formData.get('finder_name') as string || undefined,
        finder_email: formData.get('finder_email') as string || undefined,
        finder_phone: formData.get('finder_phone') as string || undefined,
        photo_url: formData.get('photo_url') as string || undefined,
      };

      // Handle photo file upload
      const photoFile = formData.get('photo') as File | null;
      if (photoFile && photoFile.size > 0) {
        const arrayBuffer = await photoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const validation = await validatePetPhotoInput({ photo_file: { buffer, mimeType: photoFile.type || 'image/jpeg' } });
        if (!validation.ok) {
          if (validation.mode === 'strict') {
            return NextResponse.json(
              { success: false, error: 'Photo rejected', details: validation.reason, validation },
              { status: 400 }
            );
          }
          // soft mode: do NOT save the photo, but accept the report with a warning
          body.photo_url = undefined;
          photoWarning = `Photo not saved: ${validation.reason}`;
        } else {
          // Convert file to base64 (in production, prefer uploading to storage first)
          const base64 = buffer.toString('base64');
          const mimeType = photoFile.type || 'image/jpeg';
          body.photo_url = `data:${mimeType};base64,${base64}`;
        }
      }
    } else {
      body = await request.json();
    }

    const petType = normalizePetType(body);
    const breed = body.breed?.trim();
    const color = body.color?.trim();
    const dateFound = (body.date_found || body.found_date || '').trim();
    // Best-effort: allow city/state to be provided either split or combined in location_detail
    const parsedLocation = parseLocationInput(`${body.location_city || ''}${body.location_state ? `, ${body.location_state}` : ''}`.trim() || (body.location_detail || ''));
    const locationCity = (body.location_city?.trim() || parsedLocation.city || '').trim();
    const locationState = (body.location_state?.trim() || parsedLocation.state || '').trim();

    if (!petType || !breed || !color || !dateFound || !locationCity || !locationState) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['pet_type (or species=dog/cat)', 'breed', 'color', 'found_date', 'location_city', 'location_state'],
        },
        { status: 400 }
      );
    }

    const foundPetName = (body.found_pet_name || 'Unknown').trim() || 'Unknown';
    const locationDetail = body.location_detail?.trim() || body.distinctive_features?.trim() || null;

    const combinedDescriptionParts: string[] = [];
    if (body.description?.trim()) combinedDescriptionParts.push(body.description.trim());
    if (body.medical_needs?.trim()) combinedDescriptionParts.push(`Medical needs: ${body.medical_needs.trim()}`);
    if (body.temperament?.trim()) combinedDescriptionParts.push(`Temperament: ${body.temperament.trim()}`);

    const combinedDescription = combinedDescriptionParts.length > 0 ? combinedDescriptionParts.join('\n') : null;

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets`;
    const payload = {
      pet_name: foundPetName,
      pet_type: petType,
      breed,
      color,
      size: body.size || 'medium',
      age: body.age?.trim() || null,
      date_lost: dateFound,
      location_city: locationCity,
      location_state: locationState,
      location_zip: body.location_zip || null,
      location_detail: locationDetail,
      markings: null,
      description: combinedDescription,
      microchip: null,
      collar: null,
      photo_url: body.photo_url || null,
      status: 'found',
      shelter_id: null,
      owner_name: body.finder_name || 'Found Pet Reporter',
      owner_email: body.finder_email || null,
      owner_phone: body.finder_phone || null,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error('[REPORT FOUND PET] Error:', details);
      return NextResponse.json({ error: 'Failed to submit report', details }, { status: 500 });
    }

    const rows = (await res.json().catch(() => [])) as any[];
    const newPet = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    // Optional background matching + persistence (ignore failures)
    try {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3007'}/api/petreunion/auto-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: (newPet as any).id, minScore: 0.3, maxResults: 10, sendNotifications: false }),
      }).catch(() => {});
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      pet: newPet,
      message: 'Found pet report submitted successfully.',
      ...(photoWarning ? { photoWarning } : {}),
    });
  } catch (error: any) {
    console.error('[REPORT FOUND PET] Fatal error:', error);
    return toServiceUnavailableResponse(error) || NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
