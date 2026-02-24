// @ts-nocheck
// This is a Deno/Supabase Edge Function - TypeScript errors here are false positives
// Deno runtime handles these imports and global types at runtime

/**
 * Fishing Buddy Finder - Matching Edge Function
 * 
 * Matches users based on fishing preferences, location, and availability.
 * Implements smart matching algorithm with filters.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now >= record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count < maxRequests) {
    record.count++;
    return true;
  }
  
  return false;
}

// Calculate match score
function calculateMatchScore(user1: any, user2: any): number {
  let score = 0;
  
  // Fishing preferences (40 points max)
  const user1Prefs = user1.fishing_preferences || {};
  const user2Prefs = user2.fishing_preferences || {};
  
  // Preferred species match
  const species1 = user1Prefs.preferred_species || [];
  const species2 = user2Prefs.preferred_species || [];
  const commonSpecies = species1.filter((s: string) => species2.includes(s));
  score += Math.min(commonSpecies.length * 10, 30);
  
  // Fishing style match
  if (user1Prefs.fishing_style === user2Prefs.fishing_style) {
    score += 10;
  }
  
  // Experience level (20 points max)
  const exp1 = user1Prefs.experience_level || 'intermediate';
  const exp2 = user2Prefs.experience_level || 'intermediate';
  
  const expLevels: { [key: string]: number } = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3,
    'expert': 4
  };
  
  const expDiff = Math.abs(expLevels[exp1] - expLevels[exp2]);
  score += Math.max(20 - (expDiff * 5), 0);
  
  // Location proximity (20 points max)
  if (user1.location && user2.location) {
    const distance = calculateDistance(
      user1.location.latitude,
      user1.location.longitude,
      user2.location.latitude,
      user2.location.longitude
    );
    
    // Closer = better score
    if (distance < 10) score += 20;
    else if (distance < 50) score += 15;
    else if (distance < 100) score += 10;
    else if (distance < 200) score += 5;
  }
  
  // Availability match (20 points max)
  const avail1 = user1.availability || [];
  const avail2 = user2.availability || [];
  const commonAvail = avail1.filter((a: string) => avail2.includes(a));
  score += Math.min(commonAvail.length * 5, 20);
  
  return Math.min(score, 100);
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
      req.headers.get('x-real-ip') || 
      'unknown';
    
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { method } = req;

    // GET - Find matches
    if (method === 'GET') {
      const url = new URL(req.url);
      const maxDistance = parseInt(url.searchParams.get('maxDistance') || '100');
      const minScore = parseInt(url.searchParams.get('minScore') || '50');

      // Get current user's profile
      const { data: currentUser, error: userError } = await supabaseClient
        .from('fishing_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userError || !currentUser) {
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Get all other users looking for fishing buddies
      const { data: potentialMatches, error: matchError } = await supabaseClient
        .from('fishing_profiles')
        .select(`
          *,
          profiles!fishing_profiles_user_id_fkey (
            id,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('looking_for_buddies', true)
        .neq('user_id', user.id);

      if (matchError) throw matchError;

      // Calculate match scores
      const matches = potentialMatches
        ?.map((match: any) => ({
          ...match,
          match_score: calculateMatchScore(currentUser, match)
        }))
        .filter((match: any) => match.match_score >= minScore)
        .sort((a: any, b: any) => b.match_score - a.match_score)
        .slice(0, 20); // Top 20 matches

      return new Response(
        JSON.stringify({ data: matches }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Update profile or send connection request
    if (method === 'POST') {
      const body = await req.json();
      const { action, ...data } = body;

      // Update fishing profile
      if (action === 'update_profile') {
        const { error } = await supabaseClient
          .from('fishing_profiles')
          .upsert({
            user_id: user.id,
            ...data,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send connection request
      if (action === 'connect') {
        const { target_user_id, message } = data;

        // Check if connection already exists
        const { data: existing } = await supabaseClient
          .from('buddy_connections')
          .select('*')
          .or(`and(user_id.eq.${user.id},buddy_id.eq.${target_user_id}),and(user_id.eq.${target_user_id},buddy_id.eq.${user.id})`)
          .single();

        if (existing) {
          return new Response(
            JSON.stringify({ error: 'Connection already exists' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Create connection request
        const { error } = await supabaseClient
          .from('buddy_connections')
          .insert({
            user_id: user.id,
            buddy_id: target_user_id,
            status: 'pending',
            message,
            requested_at: new Date().toISOString()
          });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Accept connection request
      if (action === 'accept') {
        const { connection_id } = data;

        const { error } = await supabaseClient
          .from('buddy_connections')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', connection_id)
          .eq('buddy_id', user.id); // Only the recipient can accept

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // DELETE - Remove connection
    if (method === 'DELETE') {
      const url = new URL(req.url);
      const connectionId = url.searchParams.get('connectionId');

      if (!connectionId) {
        return new Response(
          JSON.stringify({ error: 'Connection ID required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { error } = await supabaseClient
        .from('buddy_connections')
        .delete()
        .eq('id', connectionId)
        .or(`user_id.eq.${user.id},buddy_id.eq.${user.id}`);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
