import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';
import { getSupabaseClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cache the CLIP model to avoid reloading on every request
let clipModel: any = null;

async function getClipModel() {
  if (!clipModel) {
    // Load CLIP ViT-B/32 for 512-dim embeddings
    clipModel = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
  }
  return clipModel;
}

/**
 * POST /api/petreunion/match-by-image
 * Body: { imageUrl: string, threshold?: number, limit?: number, status?: 'lost'|'found'|'all' }
 * Returns: { success: boolean, matches: [...], error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, threshold = 0.7, limit = 10, status = 'all' } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid imageUrl' },
        { status: 400 }
      );
    }

    // Generate embedding from image URL using CLIP
    const model = await getClipModel();
    const output = await model(imageUrl, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data) as number[];

    if (embedding.length !== 512) {
      return NextResponse.json(
        { success: false, error: 'Invalid embedding dimension' },
        { status: 500 }
      );
    }

    // Query Supabase for similar pets
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('match_pets_by_image', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
      pet_status: status,
    });

    if (error) {
      console.error('[match-by-image] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matches: data || [],
      count: data?.length || 0,
    });
  } catch (err: any) {
    console.error('[match-by-image] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Match failed' },
      { status: 500 }
    );
  }
}
