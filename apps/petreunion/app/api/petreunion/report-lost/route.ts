import { toDatabaseNotConfiguredResponse, toServiceUnavailableResponse } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { createLostPetReport } from '@/lib/lost-pet-report';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return toDatabaseNotConfiguredResponse();
    }

    const body = (await request.json().catch(() => ({}))) as any;
    const result = await createLostPetReport({ supabaseUrl, supabaseKey, body });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, ...(result.details ? { details: result.details } : {}) }, { status: result.status });
    }

    return NextResponse.json({ success: true, pet: result.pet, message: 'Lost pet report submitted successfully.', ...(result.photoWarning ? { photoWarning: result.photoWarning } : {}) });
  } catch (error: any) {
    console.error('[REPORT LOST PET] Fatal error:', error);
    return toServiceUnavailableResponse(error) || NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
