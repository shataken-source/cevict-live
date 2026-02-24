// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Pet {
  id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  size: string;
  location_city: string;
  location_state: string;
  age?: string;
  gender?: string;
  photo_url?: string;
}

interface Alert {
  id: string;
  email: string;
  name?: string;
  pet_type?: string;
  breed?: string;
  location_city?: string;
  location_state?: string;
  size?: string;
  age_range?: string;
  gender?: string;
}

// Check if a pet matches an alert's criteria
function petMatchesAlert(pet: Pet, alert: Alert): boolean {
  // Check pet type
  if (alert.pet_type && pet.pet_type !== alert.pet_type) {
    return false;
  }

  // Check breed (case-insensitive, partial match)
  if (alert.breed) {
    const alertBreed = alert.breed.toLowerCase();
    const petBreed = (pet.breed || '').toLowerCase();
    if (!petBreed.includes(alertBreed) && !alertBreed.includes(petBreed)) {
      return false;
    }
  }

  // Check location (city and/or state)
  if (alert.location_city && pet.location_city) {
    if (pet.location_city.toLowerCase() !== alert.location_city.toLowerCase()) {
      return false;
    }
  }
  if (alert.location_state && pet.location_state) {
    if (pet.location_state.toUpperCase() !== alert.location_state.toUpperCase()) {
      return false;
    }
  }

  // Check size
  if (alert.size && pet.size) {
    if (pet.size !== alert.size) {
      return false;
    }
  }

  // Check age range
  if (alert.age_range && pet.age) {
    const age = pet.age.toLowerCase();
    const ageRange = alert.age_range.toLowerCase();
    
    if (ageRange === 'puppy' && !age.includes('puppy') && !age.includes('kitten') && !age.includes('mos') && !age.includes('month')) {
      return false;
    }
    if (ageRange === 'young' && !age.match(/\b(1|2|3)\s*(yr|year)/i)) {
      return false;
    }
    if (ageRange === 'adult' && !age.match(/\b(4|5|6|7)\s*(yr|year)/i)) {
      return false;
    }
    if (ageRange === 'senior' && !age.match(/\b(8|9|10|11|12|13|14|15)\s*(yr|year)/i)) {
      return false;
    }
  }

  // Check gender
  if (alert.gender && pet.gender) {
    if (pet.gender.toLowerCase() !== alert.gender.toLowerCase()) {
      return false;
    }
  }

  return true;
}

// Send email notification (placeholder - integrate with email service)
async function sendAlertEmail(alert: Alert, pet: Pet): Promise<void> {
  // TODO: Integrate with email service (SendGrid, Resend, etc.)
  console.log(`Would send email to ${alert.email} about pet ${pet.pet_name}`);
  
  // For now, just log it
  // In production, use an email service like:
  // - SendGrid
  // - Resend
  // - AWS SES
  // - Supabase Edge Function for email
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Configuration error',
        message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
        code: 'CONFIG_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'Request body must be valid JSON',
        code: 'INVALID_REQUEST'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { petId } = requestBody;

    if (!petId) {
      return new Response(JSON.stringify({
        error: 'Missing parameter',
        message: 'petId is required',
        code: 'MISSING_PARAMETER'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the pet
    const { data: pet, error: petError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (petError || !pet) {
      return new Response(JSON.stringify({
        error: 'Pet not found',
        message: petError?.message || 'Pet not found',
        code: 'PET_NOT_FOUND'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('pet_alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch alerts',
        message: alertsError.message,
        code: 'ALERTS_FETCH_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check each alert against the pet
    const matchedAlerts: Alert[] = [];
    for (const alert of alerts || []) {
      if (petMatchesAlert(pet, alert)) {
        matchedAlerts.push(alert);
        
        // Send email notification
        await sendAlertEmail(alert, pet);
        
        // Update last_notified_at
        await supabase
          .from('pet_alerts')
          .update({ last_notified_at: new Date().toISOString() })
          .eq('id', alert.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      petId: petId,
      petName: pet.pet_name,
      matchedAlerts: matchedAlerts.length,
      alerts: matchedAlerts.map(a => ({ id: a.id, email: a.email }))
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Alert check error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});













