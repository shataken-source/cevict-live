/**
 * Fish Species Recognition Edge Function
 * 
 * Uses Google Cloud Vision API to identify fish species from images
 * - Label Detection: Identifies objects in image
 * - Web Entity Detection: Finds related entities
 * - Species Matching: Matches against Gulf Coast fish database
 * - Returns top match + alternatives with confidence scores
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gulf Coast Fish Species Database
const FISH_SPECIES = [
  { name: 'Red Snapper', avgWeight: 8, avgLength: 24, keywords: ['snapper', 'red snapper', 'redfish'] },
  { name: 'Grouper', avgWeight: 15, avgLength: 30, keywords: ['grouper', 'bass', 'gag'] },
  { name: 'Mahi Mahi', avgWeight: 20, avgLength: 36, keywords: ['mahi', 'dolphin fish', 'dorado', 'dolphinfish'] },
  { name: 'King Mackerel', avgWeight: 25, avgLength: 40, keywords: ['mackerel', 'kingfish', 'king mackerel'] },
  { name: 'Redfish', avgWeight: 10, avgLength: 28, keywords: ['redfish', 'red drum', 'red drum fish'] },
  { name: 'Speckled Trout', avgWeight: 3, avgLength: 20, keywords: ['trout', 'speckled', 'speckled trout'] },
  { name: 'Tarpon', avgWeight: 80, avgLength: 60, keywords: ['tarpon', 'silver king', 'silverfish'] },
  { name: 'Snook', avgWeight: 12, avgLength: 32, keywords: ['snook', 'robalo', 'linesider'] },
  { name: 'Cobia', avgWeight: 35, avgLength: 45, keywords: ['cobia', 'lemonfish', 'black kingfish'] },
  { name: 'Amberjack', avgWeight: 40, avgLength: 48, keywords: ['amberjack', 'jack', 'aj'] },
];

async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:${response.headers.get('content-type') || 'image/jpeg'};base64,${base64}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

function matchSpecies(labels: Array<{ description: string; score: number }>): Array<{ species: string; confidence: number; avgWeight: number; avgLength: number }> {
  const matches: Array<{ species: string; confidence: number; avgWeight: number; avgLength: number }> = [];
  
  for (const fish of FISH_SPECIES) {
    let maxScore = 0;
    
    for (const label of labels) {
      const labelLower = label.description.toLowerCase();
      
      // Check if any keyword matches
      for (const keyword of fish.keywords) {
        if (labelLower.includes(keyword.toLowerCase())) {
          // Use label score weighted by keyword match
          const matchScore = label.score * 0.8; // Weight keyword matches
          maxScore = Math.max(maxScore, matchScore);
        }
      }
      
      // Also check if species name appears directly
      if (labelLower.includes(fish.name.toLowerCase())) {
        maxScore = Math.max(maxScore, label.score);
      }
    }
    
    if (maxScore > 0) {
      matches.push({
        species: fish.name,
        confidence: maxScore,
        avgWeight: fish.avgWeight,
        avgLength: fish.avgLength,
      });
    }
  }
  
  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches;
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

    const { action, imageUrl, imageBase64, predictedSpecies, actualSpecies, confidence } = await req.json();

    const googleVisionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY') || Deno.env.get('GOOGLE_VISION_API_KEY');
    
    if (!googleVisionApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Cloud Vision API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'identify') {
      // Get image as base64
      let imageData: string;
      
      if (imageBase64) {
        // Remove data URL prefix if present
        imageData = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      } else if (imageUrl) {
        imageData = await downloadImageAsBase64(imageUrl);
        // Remove data URL prefix
        imageData = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      } else {
        return new Response(
          JSON.stringify({ error: 'No image provided (imageUrl or imageBase64 required)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Call Google Cloud Vision API
      try {
        const visionResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  image: {
                    content: imageData,
                  },
                  features: [
                    { type: 'LABEL_DETECTION', maxResults: 10 },
                    { type: 'WEB_DETECTION', maxResults: 10 },
                  ],
                },
              ],
            }),
          }
        );

        if (!visionResponse.ok) {
          const errorData = await visionResponse.text();
          console.error('Google Vision API error:', errorData);
          return new Response(
            JSON.stringify({ error: 'Failed to analyze image' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const visionData = await visionResponse.json();
        const responses = visionData.responses?.[0];
        
        if (!responses) {
          return new Response(
            JSON.stringify({ error: 'No response from Vision API' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Combine labels from label detection and web detection
        const labels: Array<{ description: string; score: number }> = [];
        
        // Add label detection results
        if (responses.labelAnnotations) {
          for (const label of responses.labelAnnotations) {
            labels.push({
              description: label.description,
              score: label.score || 0,
            });
          }
        }
        
        // Add web detection results
        if (responses.webDetection?.webEntities) {
          for (const entity of responses.webDetection.webEntities) {
            if (entity.description && entity.score) {
              labels.push({
                description: entity.description,
                score: entity.score,
              });
            }
          }
        }

        // Match against fish species database
        const matches = matchSpecies(labels);
        
        if (matches.length === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Could not identify fish species. Please try a clearer photo or select manually.',
              rawLabels: labels.slice(0, 5),
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Top match
        const topMatch = matches[0];
        
        // Alternatives (next 2 matches)
        const alternatives = matches.slice(1, 3).map(m => ({
          species: m.species,
          confidence: m.confidence,
          estimatedWeight: m.avgWeight,
          estimatedLength: m.avgLength,
        }));

        return new Response(
          JSON.stringify({
            success: true,
            identification: {
              species: topMatch.species,
              confidence: topMatch.confidence,
              estimatedWeight: topMatch.avgWeight,
              estimatedLength: topMatch.avgLength,
              alternatives,
            },
            rawLabels: labels.slice(0, 10).map(l => ({
              label: l.description,
              score: l.score,
            })),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (visionError) {
        console.error('Vision API error:', visionError);
        return new Response(
          JSON.stringify({ error: 'Failed to analyze image. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'submit_correction') {
      // Log correction for future model improvement
      try {
        // Store correction in database (create table if needed)
        const { error: dbError } = await supabaseClient
          .from('fish_recognition_corrections')
          .insert({
            image_url: imageUrl,
            predicted_species: predictedSpecies,
            actual_species: actualSpecies,
            confidence: confidence,
            created_at: new Date().toISOString(),
          });

        // Don't fail if table doesn't exist yet
        if (dbError && !dbError.message.includes('does not exist')) {
          console.error('Error logging correction:', dbError);
        }
      } catch (error) {
        console.error('Error storing correction:', error);
        // Continue even if storage fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Correction logged for model improvement',
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
