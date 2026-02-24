/**
 * Catch of the Day - Community Voting Edge Function
 * 
 * Allows users to vote on the best fishing catches.
 * Implements rate limiting and real-time updates.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiter for Edge Functions
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
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

// Cleanup old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now >= record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get IP address for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
      req.headers.get('x-real-ip') || 
      'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip, 20, 60000)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
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
    const url = new URL(req.url);
    const catchId = url.searchParams.get('catchId');

    // GET - Get catch submissions with votes
    if (method === 'GET') {
      const { data: catches, error } = await supabaseClient
        .from('catch_submissions')
        .select(`
          *,
          catch_votes (
            user_id,
            vote_type
          ),
          profiles!catch_submissions_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('vote_count', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      // Add vote status for current user
      const catchesWithUserVote = catches?.map(catchItem => ({
        ...catchItem,
        user_voted: catchItem.catch_votes?.some((vote: any) => vote.user_id === user.id),
        user_vote_type: catchItem.catch_votes?.find((vote: any) => vote.user_id === user.id)?.vote_type
      }));

      return new Response(
        JSON.stringify({ data: catchesWithUserVote }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Submit a catch or vote
    if (method === 'POST') {
      const body = await req.json();
      const { action, ...data } = body;

      // Submit new catch
      if (action === 'submit') {
        const { trip_id, species, weight, length, photo_url, description } = data;

        const { data: newCatch, error } = await supabaseClient
          .from('catch_submissions')
          .insert({
            user_id: user.id,
            trip_id,
            species,
            weight,
            length,
            photo_url,
            description,
            vote_count: 0,
            is_public: true,
            submitted_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({ data: newCatch }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vote on a catch
      if (action === 'vote') {
        const { catch_id, vote_type } = data;

        if (!catch_id || !['upvote', 'downvote'].includes(vote_type)) {
          return new Response(
            JSON.stringify({ error: 'Invalid vote parameters' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Check if user already voted
        const { data: existingVote } = await supabaseClient
          .from('catch_votes')
          .select('*')
          .eq('catch_id', catch_id)
          .eq('user_id', user.id)
          .single();

        if (existingVote) {
          // Update existing vote
          const { error } = await supabaseClient
            .from('catch_votes')
            .update({ vote_type, voted_at: new Date().toISOString() })
            .eq('catch_id', catch_id)
            .eq('user_id', user.id);

          if (error) throw error;
        } else {
          // Insert new vote
          const { error } = await supabaseClient
            .from('catch_votes')
            .insert({
              catch_id,
              user_id: user.id,
              vote_type,
              voted_at: new Date().toISOString()
            });

          if (error) throw error;
        }

        // Update vote count
        const { data: votes } = await supabaseClient
          .from('catch_votes')
          .select('vote_type')
          .eq('catch_id', catch_id);

        const voteCount = votes?.reduce((acc, vote) => {
          return acc + (vote.vote_type === 'upvote' ? 1 : -1);
        }, 0) || 0;

        const { error: updateError } = await supabaseClient
          .from('catch_submissions')
          .update({ vote_count: voteCount })
          .eq('id', catch_id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, vote_count: voteCount }),
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

    // DELETE - Remove vote
    if (method === 'DELETE' && catchId) {
      const { error } = await supabaseClient
        .from('catch_votes')
        .delete()
        .eq('catch_id', catchId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Recalculate vote count
      const { data: votes } = await supabaseClient
        .from('catch_votes')
        .select('vote_type')
        .eq('catch_id', catchId);

      const voteCount = votes?.reduce((acc, vote) => {
        return acc + (vote.vote_type === 'upvote' ? 1 : -1);
      }, 0) || 0;

      await supabaseClient
        .from('catch_submissions')
        .update({ vote_count: voteCount })
        .eq('id', catchId);

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
