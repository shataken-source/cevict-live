/**
 * Cron Job Endpoint for Pet of the Day
 * Should be called daily (e.g., via Vercel Cron or external scheduler)
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - External: Call GET /api/cron/pet-of-the-day?secret=YOUR_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';
import { FacebookPoster, PetOfTheDay } from '../../../../lib/facebook-poster';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (if set)
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = request.nextUrl.searchParams.get('secret');
    
    if (cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const facebookPoster = new FacebookPoster();

    // Check if already posted today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingPost } = await supabase
      .from('pet_of_the_day')
      .select('pet_id, posted_at')
      .gte('posted_at', `${today}T00:00:00.000Z`)
      .lt('posted_at', `${today}T23:59:59.999Z`)
      .limit(1)
      .single();

    if (existingPost) {
      return NextResponse.json({
        success: true,
        message: 'Pet of the Day already posted today',
        petId: existingPost.pet_id,
        postedAt: existingPost.posted_at,
      });
    }

    // Get random pet that hasn't been featured in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentPets } = await supabase
      .from('pet_of_the_day')
      .select('pet_id')
      .gte('posted_at', thirtyDaysAgo.toISOString());

    const recentPetIds = recentPets?.map(p => p.pet_id) || [];

    // Get pets with photos
    let query = supabase
      .from('lost_pets')
      .select('*')
      .not('photo_url', 'is', null)
      .neq('photo_url', '')
      .limit(100);

    if (recentPetIds.length > 0) {
      query = query.not('id', 'in', `(${recentPetIds.join(',')})`);
    }

    const { data: pets, error: queryError } = await query;

    if (queryError || !pets || pets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No pets available to feature',
        details: queryError?.message,
      }, { status: 404 });
    }

    // Select random pet
    const randomIndex = Math.floor(Math.random() * pets.length);
    const selectedPet = pets[randomIndex];

    const petOfTheDay: PetOfTheDay = {
      id: selectedPet.id,
      pet_name: selectedPet.pet_name,
      pet_type: selectedPet.pet_type,
      breed: selectedPet.breed,
      color: selectedPet.color,
      size: selectedPet.size,
      age: selectedPet.age,
      gender: selectedPet.gender,
      description: selectedPet.description,
      location_city: selectedPet.location_city,
      location_state: selectedPet.location_state,
      photo_url: selectedPet.photo_url,
      status: selectedPet.status,
      date_lost: selectedPet.date_lost,
      date_found: selectedPet.date_found,
      created_at: selectedPet.created_at,
    };

    // Post to Facebook
    if (!facebookPoster.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Facebook not configured',
        pet: petOfTheDay,
      }, { status: 503 });
    }

    const postResult = await facebookPoster.postPetOfTheDayWithPhoto(petOfTheDay);

    if (!postResult.success) {
      // Record failure
      await supabase
        .from('pet_of_the_day')
        .insert({
          pet_id: selectedPet.id,
          posted_at: new Date().toISOString(),
          status: 'failed',
        });

      return NextResponse.json({
        success: false,
        error: postResult.error,
        pet: petOfTheDay,
      }, { status: 500 });
    }

    // Record success
    await supabase
      .from('pet_of_the_day')
      .insert({
        pet_id: selectedPet.id,
        posted_at: new Date().toISOString(),
        facebook_post_id: postResult.postId,
        status: 'posted',
      });

    return NextResponse.json({
      success: true,
      message: 'Pet of the Day posted to Facebook',
      pet: {
        id: petOfTheDay.id,
        name: petOfTheDay.pet_name,
        type: petOfTheDay.pet_type,
        location: `${petOfTheDay.location_city || ''}, ${petOfTheDay.location_state || ''}`.trim(),
      },
      facebook: {
        postId: postResult.postId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}
