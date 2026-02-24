import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Create PawBoost Alert for a lost pet
 * This prepares the alert data and can optionally submit to PawBoost
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { petId, autoSubmit = false } = body;

    if (!petId) {
      return NextResponse.json(
        { error: 'Pet ID is required' },
        { status: 400 }
      );
    }

    // Get pet data from database
    const { data: pet, error: petError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', petId)
      .eq('status', 'lost')
      .single();

    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Lost pet not found' },
        { status: 404 }
      );
    }

    // Prepare PawBoost alert data
    const pawboostAlert = {
      pet_name: pet.pet_name || 'Unknown',
      pet_type: pet.pet_type === 'dog' ? 'dog' : 'cat',
      breed: pet.breed || 'Mixed Breed',
      color: pet.color || 'Unknown',
      size: pet.size || 'medium',
      description: pet.description || `${pet.pet_name || 'Pet'} is lost. ${pet.markings || ''}`,
      location_city: pet.location_city,
      location_state: pet.location_state,
      location_zip: pet.location_zip || '',
      location_detail: pet.location_detail || '',
      date_lost: pet.date_lost,
      photo_url: pet.photo_url,
      owner_name: pet.owner_name,
      owner_email: pet.owner_email,
      owner_phone: pet.owner_phone,
      reward_amount: pet.reward_amount || null,
      microchip: pet.microchip || null,
      collar: pet.collar || null,
    };

    // Generate PawBoost alert URL (for manual submission)
    const alertUrl = `https://www.pawboost.com/lost-pet-alert?name=${encodeURIComponent(pawboostAlert.pet_name)}&type=${pawboostAlert.pet_type}&city=${encodeURIComponent(pawboostAlert.location_city)}&state=${encodeURIComponent(pawboostAlert.location_state)}`;

    // If autoSubmit is true, attempt to submit via Playwright
    let submissionResult: { success: boolean; message: string; error?: string } | null = null;
    if (autoSubmit) {
      try {
        const playwright = require('playwright');
        const browser = await playwright.chromium.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        
        const page = await context.newPage();
        
        // Navigate to PawBoost lost pet form
        await page.goto('https://www.pawboost.com/lost-pet-alert', { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // Fill out the form (adjust selectors based on actual PawBoost form)
        // Note: PawBoost may require login/authentication
        await page.fill('input[name="pet_name"]', pawboostAlert.pet_name);
        await page.selectOption('select[name="pet_type"]', pawboostAlert.pet_type);
        await page.fill('input[name="breed"]', pawboostAlert.breed);
        await page.fill('input[name="color"]', pawboostAlert.color);
        await page.fill('input[name="city"]', pawboostAlert.location_city);
        await page.fill('input[name="state"]', pawboostAlert.location_state);
        if (pawboostAlert.location_zip) {
          await page.fill('input[name="zip"]', pawboostAlert.location_zip);
        }
        if (pawboostAlert.description) {
          await page.fill('textarea[name="description"]', pawboostAlert.description);
        }
        
        // Submit form
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        
        // Check if submission was successful
        const success = await page.locator('.success, .alert-success, [class*="success"]').count() > 0;
        
        await browser.close();
        
        submissionResult = {
          success,
          message: success ? 'PawBoost alert submitted successfully' : 'PawBoost alert submission may have failed'
        };
      } catch (error: any) {
        console.error('[PAWBOOST] Auto-submit error:', error);
        submissionResult = {
          success: false,
          error: error.message,
          message: 'Auto-submission failed. Use manual submission URL instead.'
        };
      }
    }

    // Save alert status to database (if you have a pawboost_alerts table)
    // For now, we'll just return the prepared data

    return NextResponse.json({
      success: true,
      petId: pet.id,
      alertData: pawboostAlert,
      manualSubmissionUrl: alertUrl,
      autoSubmit: autoSubmit,
      submissionResult: submissionResult,
      message: autoSubmit && submissionResult?.success 
        ? 'PawBoost alert created and submitted successfully'
        : 'PawBoost alert data prepared. Use manualSubmissionUrl to complete submission.'
    });

  } catch (error: any) {
    console.error('[PAWBOOST ALERT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PawBoost alert' },
      { status: 500 }
    );
  }
}

