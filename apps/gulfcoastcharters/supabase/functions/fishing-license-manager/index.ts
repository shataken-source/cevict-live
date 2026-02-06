/**
 * Fishing License Manager Edge Function
 * 
 * Handles fishing license purchase, verification, and management
 * Actions:
 * - get_requirements: Get state license requirements
 * - calculate_price: Calculate license price
 * - purchase_license: Purchase license with Stripe
 * - verify_license: Verify license validity (captain)
 * - get_user_licenses: Get user's licenses
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// State pricing database
const STATE_PRICING: Record<string, Record<string, Record<string, Record<string, number>>>> = {
  TX: {
    saltwater: {
      resident: { annual: 35, day: 11 },
      nonResident: { annual: 63, day: 11 },
    },
    all_water: {
      resident: { annual: 35, day: 11 },
      nonResident: { annual: 63, day: 11 },
    },
  },
  LA: {
    basic: {
      resident: { annual: 20, '3day': 15 },
      nonResident: { annual: 60, '3day': 15 },
    },
  },
  MS: {
    all_water: {
      resident: { annual: 23, day: 8 },
      nonResident: { annual: 58, day: 8 },
    },
  },
  AL: {
    saltwater: {
      resident: { annual: 26.40, '7day': 30.90 },
      nonResident: { annual: 56.40, '7day': 30.90 },
    },
  },
  FL: {
    saltwater: {
      resident: { annual: 17, '3day': 17 },
      nonResident: { annual: 47, '3day': 17 },
    },
  },
};

// State requirements
const STATE_REQUIREMENTS: Record<string, { minAge: number; exemptions: string[] }> = {
  TX: { minAge: 17, exemptions: ['Under 17', 'Over 65', 'Charter guest with captain license'] },
  LA: { minAge: 16, exemptions: ['Under 16', 'Over 60', 'Charter guest with captain license'] },
  MS: { minAge: 16, exemptions: ['Under 16', 'Over 65', 'Charter guest with captain license'] },
  AL: { minAge: 16, exemptions: ['Under 16', 'Over 65', 'Charter guest with captain license'] },
  FL: { minAge: 16, exemptions: ['Under 16', 'Over 65', 'Charter guest with captain license'] },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { action, stateCode, licenseType, residentStatus, duration, userId, bookingId, guestName, guestEmail, guestPhone, dateOfBirth, address, price, licenseNumber, captainId } = await req.json();

    if (action === 'get_requirements') {
      const requirements = STATE_REQUIREMENTS[stateCode];
      if (!requirements) {
        return new Response(
          JSON.stringify({ error: 'Invalid state code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, requirements }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'calculate_price') {
      const pricing = STATE_PRICING[stateCode]?.[licenseType]?.[residentStatus]?.[duration];
      if (!pricing) {
        return new Response(
          JSON.stringify({ error: 'Invalid license configuration' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, price: pricing }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'purchase_license') {
      // Calculate price if not provided
      let finalPrice = price;
      if (!finalPrice) {
        const pricing = STATE_PRICING[stateCode]?.[licenseType]?.[residentStatus]?.[duration];
        if (!pricing) {
          return new Response(
            JSON.stringify({ error: 'Invalid license configuration' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        finalPrice = pricing;
      }

      // Generate license number
      const currentYear = new Date().getFullYear();
      const { data: licenseNumData, error: licenseNumError } = await supabaseClient.rpc('generate_license_number', {
        p_state_code: stateCode,
        p_year: currentYear,
      });

      if (licenseNumError) {
        console.error('Error generating license number:', licenseNumError);
        // Fallback: generate manually
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const licenseNumber = `${stateCode}-${currentYear}-${randomNum}`;
      }

      const licenseNumber = licenseNumData || `${stateCode}-${currentYear}-${Math.floor(100000 + Math.random() * 900000)}`;

      // Calculate expiration date
      const issueDate = new Date().toISOString().split('T')[0];
      const { data: expirationData, error: expirationError } = await supabaseClient.rpc('calculate_license_expiration', {
        p_issue_date: issueDate,
        p_duration: duration,
      });

      const expirationDate = expirationData || (() => {
        const exp = new Date(issueDate);
        if (duration === 'day') exp.setDate(exp.getDate() + 1);
        else if (duration === '3day') exp.setDate(exp.getDate() + 3);
        else if (duration === '7day') exp.setDate(exp.getDate() + 7);
        else if (duration === 'annual') exp.setFullYear(exp.getFullYear() + 1);
        return exp.toISOString().split('T')[0];
      })();

      // Create Stripe payment intent
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Stripe not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: Math.round(finalPrice * 100).toString(), // Convert to cents
            currency: 'usd',
            metadata: JSON.stringify({
              license_number: licenseNumber,
              state_code: stateCode,
              license_type: licenseType,
              duration: duration,
              user_id: userId,
              booking_id: bookingId || '',
            }),
          }),
        });

        const stripeData = await stripeResponse.json();

        if (!stripeResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to create payment intent', details: stripeData }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create license record (pending until payment confirmed)
        const { data: license, error: licenseError } = await supabaseClient
          .from('fishing_licenses')
          .insert({
            user_id: userId,
            booking_id: bookingId || null,
            license_number: licenseNumber,
            state_code: stateCode,
            license_type: licenseType,
            resident_status: residentStatus,
            duration: duration,
            guest_name: guestName,
            guest_email: guestEmail,
            guest_phone: guestPhone,
            date_of_birth: dateOfBirth,
            address_street: address?.street,
            address_city: address?.city,
            address_state: address?.state,
            address_zip: address?.zipCode,
            issue_date: issueDate,
            expiration_date: expirationDate,
            price: finalPrice,
            stripe_payment_intent_id: stripeData.id,
            status: 'pending',
          })
          .select()
          .single();

        if (licenseError) {
          console.error('Error creating license:', licenseError);
          return new Response(
            JSON.stringify({ error: 'Failed to create license record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            license: {
              id: license.id,
              licenseNumber: license.license_number,
              expirationDate: license.expiration_date,
              stateCode: license.state_code,
              licenseType: license.license_type,
            },
            clientSecret: stripeData.client_secret,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return new Response(
          JSON.stringify({ error: 'Payment processing failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'verify_license') {
      // Verify license number format: XX-YYYY-NNNNNN
      const licenseRegex = /^[A-Z]{2}-\d{4}-\d{6}$/;
      if (!licenseRegex.test(licenseNumber)) {
        return new Response(
          JSON.stringify({ error: 'Invalid license number format. Expected: XX-YYYY-NNNNNN' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Look up license
      const { data: license, error: licenseError } = await supabaseClient
        .from('fishing_licenses')
        .select('*')
        .eq('license_number', licenseNumber)
        .single();

      if (licenseError || !license) {
        return new Response(
          JSON.stringify({ valid: false, error: 'License not found' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if expired
      const expirationDate = new Date(license.expiration_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isExpired = expirationDate < today;
      const isValid = license.status === 'active' && !isExpired;

      // Record verification
      await supabaseClient
        .from('license_verifications')
        .insert({
          license_id: license.id,
          license_number: licenseNumber,
          booking_id: license.booking_id,
          captain_id: captainId,
          verified_at: new Date().toISOString(),
          valid: isValid,
          notes: isExpired ? 'License expired' : license.status !== 'active' ? `Status: ${license.status}` : null,
        });

      // Award points for verification (gamification)
      try {
        await supabaseClient.functions.invoke('points-rewards-system', {
          body: {
            action: 'award_points',
            userId: captainId,
            actionType: 'license_verification',
            amount: 5,
          },
        });
      } catch (pointsError) {
        console.error('Error awarding verification points:', pointsError);
        // Don't fail verification if points fail
      }

      return new Response(
        JSON.stringify({
          valid: isValid,
          license: {
            licenseNumber: license.license_number,
            status: license.status,
            expirationDate: license.expiration_date,
            isExpired,
            verifiedAt: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_user_licenses') {
      const { data: licenses, error: licensesError } = await supabaseClient
        .from('fishing_licenses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (licensesError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch licenses' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, licenses: licenses || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
