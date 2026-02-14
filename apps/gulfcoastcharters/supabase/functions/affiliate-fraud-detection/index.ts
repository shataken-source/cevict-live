/**
 * Affiliate Fraud Detection Edge Function
 *
 * Actions: check_fraud, create_alert
 * Called when referrals are created or before payouts.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const THRESHOLD_CRITICAL = 70;
const THRESHOLD_HIGH = 50;
const THRESHOLD_MEDIUM = 30;
const POINTS_IP = 25;
const POINTS_VELOCITY = 20;
const POINTS_SELF_REFERRAL = 30;
const POINTS_DUPLICATE = 25;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, referral_id, affiliate_id, affiliate_name, type, severity, description, evidence } = body;

    if (action === 'check_fraud') {
      const referralId = referral_id ?? body.referralId;
      const affId = affiliate_id ?? body.affiliateId;
      if (!referralId && !affId) {
        return new Response(
          JSON.stringify({ error: 'referral_id or affiliate_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let referral: { ip_address?: string; referred_user_id?: string; affiliate_id?: string; created_at?: string } | null = null;
      if (referralId) {
        const { data: refRow } = await admin.from('referral_tracking').select('*').eq('id', referralId).single();
        referral = refRow;
      }

      const affIdToUse = affId ?? referral?.affiliate_id;
      if (!affIdToUse) {
        return new Response(
          JSON.stringify({
            fraud_detected: false,
            fraud_score: 0,
            checks: {
              ip_check: { suspicious: false, count: 0 },
              velocity_check: { suspicious: false, referrals_per_hour: 0 },
              self_referral: { suspicious: false },
              duplicate_account: { suspicious: false, matches: 0 },
              pattern_analysis: { suspicious: false, confidence: 0 },
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ip = referral?.ip_address ?? null;
      const referredUserId = referral?.referred_user_id ?? null;

      // IP duplication: count referrals from same IP (same affiliate)
      let ipCount = 0;
      if (ip) {
        const { count } = await admin
          .from('referral_tracking')
          .select('*', { count: 'exact', head: true })
          .eq('affiliate_id', affIdToUse)
          .eq('ip_address', ip);
        ipCount = count ?? 0;
      }
      const ipSuspicious = ipCount > 3;
      const ipPoints = ipSuspicious ? POINTS_IP : 0;

      // Velocity: referrals in last hour for this affiliate
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: velocityCount } = await admin
        .from('referral_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affIdToUse)
        .gte('created_at', oneHourAgo);
      const referralsPerHour = velocityCount ?? 0;
      const velocitySuspicious = referralsPerHour > 10;
      const velocityPoints = velocitySuspicious ? POINTS_VELOCITY : 0;

      // Self-referral: referrer = referee
      const selfReferralSuspicious = referredUserId && String(referredUserId) === String(affIdToUse);
      const selfReferralPoints = selfReferralSuspicious ? POINTS_SELF_REFERRAL : 0;

      // Duplicate account: same referred_user_id used multiple times by same affiliate (simplified)
      let duplicateMatches = 0;
      if (referredUserId) {
        const { count } = await admin
          .from('referral_tracking')
          .select('*', { count: 'exact', head: true })
          .eq('affiliate_id', affIdToUse)
          .eq('referred_user_id', referredUserId);
        duplicateMatches = (count ?? 0) > 1 ? count ?? 0 : 0;
      }
      const duplicateSuspicious = duplicateMatches > 1;
      const duplicatePoints = duplicateSuspicious ? POINTS_DUPLICATE : 0;

      const fraudScore = ipPoints + velocityPoints + selfReferralPoints + duplicatePoints;
      const fraudDetected = fraudScore > THRESHOLD_MEDIUM;

      return new Response(
        JSON.stringify({
          fraud_detected: fraudDetected,
          fraud_score: fraudScore,
          checks: {
            ip_check: { suspicious: ipSuspicious, count: ipCount },
            velocity_check: { suspicious: velocitySuspicious, referrals_per_hour: referralsPerHour },
            self_referral: { suspicious: selfReferralSuspicious },
            duplicate_account: { suspicious: duplicateSuspicious, matches: duplicateMatches },
            pattern_analysis: { suspicious: false, confidence: 0 },
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_alert') {
      const affId = affiliate_id ?? body.affiliateId;
      const name = affiliate_name ?? body.affiliate_name ?? 'Unknown';
      const alertType = type ?? body.type ?? 'manual_review';
      const sev = severity ?? body.severity ?? 'medium';
      const desc = description ?? body.description ?? 'Alert created';
      const ev = evidence ?? body.evidence ?? {};

      if (!affId) {
        return new Response(
          JSON.stringify({ error: 'affiliate_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await admin.from('fraud_alerts').insert({
        affiliate_id: affId,
        affiliate_name: name,
        type: alertType,
        severity: sev,
        description: desc,
        evidence: ev,
        status: 'pending',
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use check_fraud or create_alert.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
