/**
 * Share Image Generator Edge Function
 * 
 * Generates custom branded social media share images using AI Gateway
 * Supports: avatar, achievement, catch share types
 * Output: 1200x630px optimized for social platforms
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();

    const gatewayApiKey = Deno.env.get('GATEWAY_API_KEY');
    if (!gatewayApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate prompt based on share type
    let prompt = '';
    if (type === 'avatar') {
      prompt = `Create a professional social media share image (1200x630px) for Gulf Coast Charters. 
        Show a user profile card with: Username: ${data.username}, Points: ${data.points}, Level: ${data.level}.
        Use ocean blue and white colors, include fishing boat imagery, professional design.`;
    } else if (type === 'achievement') {
      prompt = `Create a celebration social media share image (1200x630px) for Gulf Coast Charters.
        Achievement unlocked: "${data.achievementName}". 
        Use gold/yellow celebration colors, trophy imagery, ocean theme, professional design.`;
    } else if (type === 'catch') {
      prompt = `Create a fishing catch social media share image (1200x630px) for Gulf Coast Charters.
        Show a fishing catch with weight: ${data.weight}lbs, species: ${data.species}, location: ${data.location}.
        Use ocean blue colors, fishing imagery, professional design.`;
    } else {
      prompt = `Create a professional social media share image (1200x630px) for Gulf Coast Charters.
        ${data.shareText || 'Share from Gulf Coast Charters'}. 
        Use ocean blue and white colors, fishing boat imagery, professional design.`;
    }

    // Call AI Gateway for image generation
    try {
      const gatewayResponse = await fetch('https://api.gateway.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gatewayApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-flash-image',
          prompt: prompt,
          size: '1200x630',
          quality: 'standard',
          n: 1,
        }),
      });

      if (!gatewayResponse.ok) {
        const errorData = await gatewayResponse.text();
        console.error('Gateway API error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to generate image' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const gatewayData = await gatewayResponse.json();
      const imageUrl = gatewayData.data?.[0]?.url || gatewayData.image_url;

      if (!imageUrl) {
        return new Response(
          JSON.stringify({ error: 'No image URL returned' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl,
          type,
          metadata: data 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (gatewayError) {
      console.error('Gateway error:', gatewayError);
      // Fallback: return a placeholder or default image URL
      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl: `${Deno.env.get('SITE_URL') || 'https://gulfcoastcharters.com'}/og-default.jpg`,
          type,
          metadata: data,
          note: 'Using default image due to generation error'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
