import { NextRequest, NextResponse } from 'next/server';
import { generatePosterForPet, generatePetPoster, PetData, PosterOptions } from '../../../../lib/qr-poster-generator';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/petreunion/generate-poster
 * Generates a QR poster for a lost pet
 * 
 * Body: { petId: number, options?: PosterOptions }
 * Returns: { posterUrl, qrUrl, downloadUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { petId, options = {} } = body;
    
    if (!petId) {
      return NextResponse.json(
        { error: 'petId is required' },
        { status: 400 }
      );
    }
    
    console.log(`[Poster Generator] Generating poster for pet ${petId}`);
    
    const result = await generatePosterForPet(petId, options);
    
    return NextResponse.json({
      success: true,
      petId,
      posterUrl: result.posterUrl,
      qrUrl: result.qrUrl,
      downloadUrl: `/api/petreunion/download-poster?petId=${petId}`,
      message: 'Poster generated successfully!'
    });
    
  } catch (error: any) {
    console.error('[Poster Generator] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate poster' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/petreunion/generate-poster?petId=123
 * Returns the poster PDF directly for download
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const includeReward = searchParams.get('reward') === 'true';
    const includePhone = searchParams.get('phone') === 'true';
    const colorScheme = (searchParams.get('color') || 'urgent') as 'urgent' | 'hopeful' | 'neutral';
    
    if (!petId) {
      return NextResponse.json(
        { error: 'petId is required' },
        { status: 400 }
      );
    }
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    // Fetch pet data
    const { data: pet, error } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', petId)
      .single();
    
    if (error || !pet) {
      return NextResponse.json(
        { error: 'Pet not found' },
        { status: 404 }
      );
    }
    
    // Generate poster
    const options: PosterOptions = {
      includeReward,
      includePhone,
      colorScheme
    };
    
    const pdfBuffer = await generatePetPoster(pet, options);
    
    // Return as downloadable PDF
    const petName = pet.pet_name || 'pet';
    const filename = `lost-${petName.toLowerCase().replace(/\s+/g, '-')}-poster.pdf`;
    
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
    
  } catch (error: any) {
    console.error('[Poster Generator] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate poster' },
      { status: 500 }
    );
  }
}

