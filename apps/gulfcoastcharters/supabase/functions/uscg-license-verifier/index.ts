/**
 * USCG License Verifier Edge Function
 * 
 * Verifies USCG (United States Coast Guard) captain licenses
 * - Single license verification
 * - Batch verification of all licenses
 * - Email notifications for discrepancies
 * 
 * Note: USCG doesn't currently offer public API access.
 * This implementation validates format and simulates verification.
 * Framework ready for real API integration when available.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// USCG License Number Format: ML-1234567 or 1234567
function validateUSCGLicenseFormat(licenseNumber: string): boolean {
  // Remove spaces and convert to uppercase
  const cleaned = licenseNumber.trim().toUpperCase().replace(/\s+/g, '');
  
  // Format: ML-1234567 or just 1234567 (7 digits)
  const format1 = /^ML-\d{7}$/; // ML-1234567
  const format2 = /^\d{7}$/; // 1234567
  
  return format1.test(cleaned) || format2.test(cleaned);
}

// MMR Number Format: MMR-987654 or 987654
function validateMMRFormat(mmrNumber: string): boolean {
  if (!mmrNumber) return true; // Optional
  
  const cleaned = mmrNumber.trim().toUpperCase().replace(/\s+/g, '');
  
  // Format: MMR-987654 or just 987654
  const format1 = /^MMR-\d{6}$/;
  const format2 = /^\d{6}$/;
  
  return format1.test(cleaned) || format2.test(cleaned);
}

// Simulate USCG verification (replace with real API call when available)
async function verifyWithUSCG(licenseNumber: string, mmrNumber?: string): Promise<{
  verified: boolean;
  expiresAt?: string;
  data?: any;
}> {
  // TODO: Replace with actual USCG NMC API call
  // Contact: IASKNMC@uscg.mil for API access
  
  // For now, validate format and simulate verification
  if (!validateUSCGLicenseFormat(licenseNumber)) {
    return { verified: false, data: { error: 'Invalid license number format' } };
  }
  
  if (mmrNumber && !validateMMRFormat(mmrNumber)) {
    return { verified: false, data: { error: 'Invalid MMR number format' } };
  }
  
  // Simulate verification (in production, call USCG API)
  // For demo purposes, accept valid formats
  const verified = true;
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 5); // 5 years from now
  
  return {
    verified,
    expiresAt: expiresAt.toISOString(),
    data: {
      licenseNumber: licenseNumber.toUpperCase(),
      mmrNumber: mmrNumber?.toUpperCase(),
      verifiedAt: new Date().toISOString(),
      note: 'Simulated verification - USCG API integration pending',
    },
  };
}

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

    const { action, licenseNumber, mmrNumber, captainId } = await req.json();

    if (action === 'verify-single') {
      if (!licenseNumber) {
        return new Response(
          JSON.stringify({ error: 'License number is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!captainId) {
        return new Response(
          JSON.stringify({ error: 'Captain ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify with USCG (simulated)
      const verification = await verifyWithUSCG(licenseNumber, mmrNumber);

      // Store verification record
      const { data: verificationRecord, error: dbError } = await supabaseClient
        .from('uscg_license_verifications')
        .insert({
          user_id: captainId,
          license_number: licenseNumber.toUpperCase(),
          mmr_number: mmrNumber?.toUpperCase(),
          verification_status: verification.verified ? 'verified' : 'failed',
          verified_at: verification.verified ? new Date().toISOString() : null,
          expires_at: verification.expiresAt,
          verification_data: verification.data,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to store verification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update profile USCG status
      if (verification.verified) {
        await supabaseClient.rpc('update_uscg_profile_status', {
          p_user_id: captainId,
          p_verified: true,
          p_verified_at: new Date().toISOString(),
        });

        // Update profile license numbers
        await supabaseClient
          .from('profiles')
          .update({
            uscg_license_number: licenseNumber.toUpperCase(),
            uscg_mmr_number: mmrNumber?.toUpperCase(),
          })
          .eq('id', captainId);
      }

      // Send email notification if verification failed
      if (!verification.verified) {
        try {
          const mailjetApiKey = Deno.env.get('MAILJET_API_KEY');
          const mailjetSecretKey = Deno.env.get('MAILJET_SECRET_KEY');

          if (mailjetApiKey && mailjetSecretKey) {
            // Get captain email
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('email')
              .eq('id', captainId)
              .single();

            if (profile?.email) {
              // Send email via Mailjet (implementation would go here)
              console.log(`Would send email to ${profile.email} about verification failure`);
            }
          }
        } catch (emailError) {
          console.error('Email notification error:', emailError);
          // Don't fail verification if email fails
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: verification.verified,
          verification: verificationRecord,
          message: verification.verified
            ? 'USCG license verified successfully'
            : 'USCG license verification failed',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify-all') {
      // Get all captains with USCG license numbers
      const { data: captains, error: captainsError } = await supabaseClient
        .from('profiles')
        .select('id, uscg_license_number, uscg_mmr_number')
        .not('uscg_license_number', 'is', null);

      if (captainsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch captains' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = {
        total: captains?.length || 0,
        verified: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Verify each captain's license
      for (const captain of captains || []) {
        try {
          const verification = await verifyWithUSCG(
            captain.uscg_license_number,
            captain.uscg_mmr_number || undefined
          );

          // Store verification record
          await supabaseClient
            .from('uscg_license_verifications')
            .insert({
              user_id: captain.id,
              license_number: captain.uscg_license_number,
              mmr_number: captain.uscg_mmr_number,
              verification_status: verification.verified ? 'verified' : 'failed',
              verified_at: verification.verified ? new Date().toISOString() : null,
              expires_at: verification.expiresAt,
              verification_data: verification.data,
            });

          // Update profile status
          if (verification.verified) {
            await supabaseClient.rpc('update_uscg_profile_status', {
              p_user_id: captain.id,
              p_verified: true,
              p_verified_at: new Date().toISOString(),
            });
            results.verified++;
          } else {
            results.failed++;
          }
        } catch (error: any) {
          results.errors.push(`Captain ${captain.id}: ${error.message}`);
          results.failed++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          results,
          message: `Verified ${results.verified} licenses, ${results.failed} failed`,
        }),
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
