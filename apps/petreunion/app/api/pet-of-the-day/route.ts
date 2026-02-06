/**
 * Pet of the Day API
 * Selects a random pet and posts to Facebook
 * Can be called manually or via cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';
import { FacebookPoster, PetOfTheDay } from '../../../lib/facebook-poster';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'post'; // 'post' or 'preview'
    const force = searchParams.get('force') === 'true'; // Force repost even if already posted today

    const supabase = getSupabaseClient();
    const facebookPoster = new FacebookPoster();

    // Check if we already posted today (unless forced)
    if (!force && action === 'post') {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data: existingPost } = await supabase
        .from('pet_of_the_day')
        .select('pet_id, posted_at')
        .gte('posted_at', `${today}T00:00:00.000Z`)
        .lt('posted_at', `${today}T23:59:59.999Z`)
        .limit(1)
        .single();

      if (existingPost) {
        return NextResponse.json({
          success: false,
          message: 'Pet of the Day already posted today',
          petId: existingPost.pet_id,
          postedAt: existingPost.posted_at,
          note: 'Use ?force=true to post again',
        });
      }
    }

    // Get random pet that hasn't been featured recently (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get list of recently featured pets
    const { data: recentPets } = await supabase
      .from('pet_of_the_day')
      .select('pet_id')
      .gte('posted_at', thirtyDaysAgo.toISOString());

    const recentPetIds = recentPets?.map(p => p.pet_id) || [];

    // Query for pets with photos, excluding recently featured ones
    let query = supabase
      .from('lost_pets')
      .select('*')
      .not('photo_url', 'is', null)
      .neq('photo_url', '')
      .limit(100); // Get a pool to randomize from

    // Exclude recently featured pets if any
    if (recentPetIds.length > 0) {
      query = query.not('id', 'in', `(${recentPetIds.join(',')})`);
    }

    const { data: pets, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching pets:', queryError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch pets',
        details: queryError.message,
      }, { status: 500 });
    }

    if (!pets || pets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No pets with photos found',
        message: 'Need pets with photos to feature',
      }, { status: 404 });
    }

    // Select random pet from the pool
    const randomIndex = Math.floor(Math.random() * pets.length);
    const selectedPet = pets[randomIndex] as PetOfTheDay;

    // Format pet data
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
      status: selectedPet.status as 'lost' | 'found',
      date_lost: selectedPet.date_lost,
      date_found: selectedPet.date_found,
      created_at: selectedPet.created_at,
    };

    // If preview mode, just return the formatted post
    if (action === 'preview') {
      const previewMessage = facebookPoster.formatPetPost(petOfTheDay);
      return NextResponse.json({
        success: true,
        action: 'preview',
        pet: petOfTheDay,
        preview: {
          message: previewMessage,
          photoUrl: petOfTheDay.photo_url,
        },
        note: 'This is a preview. Use ?action=post to actually post to Facebook.',
      });
    }

    // Post to Facebook
    if (!facebookPoster.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Facebook not configured',
        pet: petOfTheDay,
        message: 'Set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID to enable posting',
      }, { status: 503 });
    }

    const postResult = await facebookPoster.postPetOfTheDayWithPhoto(petOfTheDay);

    if (!postResult.success) {
      return NextResponse.json({
        success: false,
        error: postResult.error,
        pet: petOfTheDay,
      }, { status: 500 });
    }

    // Record the post in database
    const { error: insertError } = await supabase
      .from('pet_of_the_day')
      .insert({
        pet_id: selectedPet.id,
        posted_at: new Date().toISOString(),
        facebook_post_id: postResult.postId,
        status: 'posted',
      });

    if (insertError) {
      console.error('Error recording pet of the day:', insertError);
      // Don't fail the request if recording fails
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Pet of the Day posted to Facebook',
      pet: petOfTheDay,
      facebook: {
        postId: postResult.postId,
        message: postResult.message,
      },
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    console.error('Error in Pet of the Day API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}

/**
 * POST endpoint for manual triggering (with optional pet ID)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const petId = body.petId;
    const preview = body.preview === true;

    const supabase = getSupabaseClient();
    const facebookPoster = new FacebookPoster();

    let selectedPet: any;

    if (petId) {
      // Get specific pet
      const { data, error } = await supabase
        .from('lost_pets')
        .select('*')
        .eq('id', petId)
        .single();

      if (error || !data) {
        return NextResponse.json({
          success: false,
          error: 'Pet not found',
        }, { status: 404 });
      }

      selectedPet = data;
    } else {
      // Get random pet (same logic as GET)
      const { data: pets } = await supabase
        .from('lost_pets')
        .select('*')
        .not('photo_url', 'is', null)
        .neq('photo_url', '')
        .limit(100);

      if (!pets || pets.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No pets with photos found',
        }, { status: 404 });
      }

      const randomIndex = Math.floor(Math.random() * pets.length);
      selectedPet = pets[randomIndex];
    }

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

    if (preview) {
      const previewMessage = facebookPoster.formatPetPost(petOfTheDay);
      return NextResponse.json({
        success: true,
        action: 'preview',
        pet: petOfTheDay,
        preview: {
          message: previewMessage,
          photoUrl: petOfTheDay.photo_url,
        },
      });
    }

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
      return NextResponse.json({
        success: false,
        error: postResult.error,
        pet: petOfTheDay,
      }, { status: 500 });
    }

    // Record the post
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
      pet: petOfTheDay,
      facebook: {
        postId: postResult.postId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
