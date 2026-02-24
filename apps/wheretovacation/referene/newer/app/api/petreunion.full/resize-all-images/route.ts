import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { downloadAndResizeImage, resizeImageServer } from '@/lib/image-resize-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Resize all images in the database to fit website better
 * Processes images in batches to avoid overwhelming the server
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
    const { 
      maxWidth = 800, 
      maxHeight = 800, 
      quality = 0.85, 
      format = 'jpeg',
      batchSize = 10,
      limit = null // If set, only process this many images
    } = body;

    console.log('[RESIZE ALL] Starting image resize process...');
    console.log(`[RESIZE ALL] Settings: ${maxWidth}x${maxHeight}, quality: ${quality}, format: ${format}`);

    // Get all pets with images
    let query = supabase
      .from('lost_pets')
      .select('id, pet_name, photo_url')
      .not('photo_url', 'is', null);

    if (limit) {
      query = query.limit(limit);
    }

    const { data: pets, error: petsError } = await query;

    if (petsError) {
      throw petsError;
    }

    if (!pets || pets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pets with images found',
        processed: 0,
        skipped: 0,
        errors: 0
      });
    }

    console.log(`[RESIZE ALL] Found ${pets.length} pets with images`);

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      errorsList: [] as string[],
      total: pets.length
    };

    // Process in batches
    for (let i = 0; i < pets.length; i += batchSize) {
      const batch = pets.slice(i, i + batchSize);
      console.log(`[RESIZE ALL] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pets.length / batchSize)} (${batch.length} images)...`);

      // Process batch in parallel
      const batchPromises = batch.map(async (pet) => {
        try {
          const photoUrl = pet.photo_url;
          if (!photoUrl) {
            results.skipped++;
            return;
          }

          // Check if it's already a base64 data URL (might already be resized)
          if (photoUrl.startsWith('data:image')) {
            // Extract base64 part
            const base64Match = photoUrl.match(/^data:image\/(\w+);base64,(.+)$/);
            if (base64Match) {
              const [, mimeType, base64Data] = base64Match;
              const buffer = Buffer.from(base64Data, 'base64');
              
              // Check if image is already small enough (less than 500KB and reasonable dimensions)
              // We'll resize anyway to ensure consistency, but skip if it's already very small
              if (buffer.length < 100000) { // Less than 100KB
                // Check dimensions if possible
                try {
                  const sharp = await import('sharp').catch(() => null);
                  if (sharp) {
                    const metadata = await sharp.default(buffer).metadata();
                    if (metadata.width && metadata.height) {
                      // If already within our target size, skip
                      if (metadata.width <= maxWidth && metadata.height <= maxHeight && buffer.length < 200000) {
                        console.log(`[RESIZE ALL] Skipping ${pet.pet_name || pet.id}: already optimized (${metadata.width}x${metadata.height}, ${buffer.length} bytes)`);
                        results.skipped++;
                        return;
                      }
                    }
                  }
                } catch (e) {
                  // Continue with resize if we can't check
                }
              }

              // Resize base64 image
              const resizedBuffer = await resizeImageServer(buffer, {
                maxWidth,
                maxHeight,
                quality,
                format: format as 'jpeg' | 'png' | 'webp',
                maintainAspectRatio: true,
              });

              // Convert back to base64
              const base64 = resizedBuffer.toString('base64');
              const newMimeType = `image/${format}`;
              const newDataUrl = `data:${newMimeType};base64,${base64}`;

              // Update database
              const { error: updateError } = await supabase
                .from('lost_pets')
                .update({ photo_url: newDataUrl })
                .eq('id', pet.id);

              if (updateError) {
                throw updateError;
              }

              results.processed++;
              console.log(`[RESIZE ALL] ✓ Resized ${pet.pet_name || pet.id}: ${buffer.length} → ${resizedBuffer.length} bytes`);
            } else {
              results.skipped++;
            }
          } 
          // If it's a URL, download and resize
          else if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
            try {
              // Download and resize
              const resizedBuffer = await downloadAndResizeImage(photoUrl, {
                maxWidth,
                maxHeight,
                quality,
                format: format as 'jpeg' | 'png' | 'webp',
                maintainAspectRatio: true,
              });

              // Convert to base64
              const base64 = resizedBuffer.toString('base64');
              const mimeType = `image/${format}`;
              const newDataUrl = `data:${mimeType};base64,${base64}`;

              // Update database
              const { error: updateError } = await supabase
                .from('lost_pets')
                .update({ photo_url: newDataUrl })
                .eq('id', pet.id);

              if (updateError) {
                throw updateError;
              }

              results.processed++;
              console.log(`[RESIZE ALL] ✓ Resized ${pet.pet_name || pet.id}: ${resizedBuffer.length} bytes`);
            } catch (downloadError: any) {
              results.errors++;
              const errorMsg = `Failed to resize ${pet.pet_name || pet.id}: ${downloadError.message}`;
              results.errorsList.push(errorMsg);
              console.error(`[RESIZE ALL] ✗ ${errorMsg}`);
            }
          } else {
            // Unknown format, skip
            results.skipped++;
            console.log(`[RESIZE ALL] Skipping ${pet.pet_name || pet.id}: unknown image format`);
          }

          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          results.errors++;
          const errorMsg = `Error processing ${pet.pet_name || pet.id}: ${error.message}`;
          results.errorsList.push(errorMsg);
          console.error(`[RESIZE ALL] ✗ ${errorMsg}`);
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches
      if (i + batchSize < pets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[RESIZE ALL] Complete! Processed: ${results.processed}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

    return NextResponse.json({
      success: true,
      message: `Resized ${results.processed} images, skipped ${results.skipped}, ${results.errors} errors`,
      ...results
    });

  } catch (error: any) {
    console.error('[RESIZE ALL] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resize images' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get stats about images in database
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get count of pets with images
    const { count, error: countError } = await supabase
      .from('lost_pets')
      .select('id', { count: 'exact', head: true })
      .not('photo_url', 'is', null);

    if (countError) {
      throw countError;
    }

    // Sample a few images to check their sizes
    const { data: samplePets, error: sampleError } = await supabase
      .from('lost_pets')
      .select('id, photo_url')
      .not('photo_url', 'is', null)
      .limit(10);

    let sampleStats = {
      base64Count: 0,
      urlCount: 0,
      averageSize: 0,
      sizes: [] as number[]
    };

    if (samplePets && !sampleError) {
      for (const pet of samplePets) {
        if (pet.photo_url) {
          if (pet.photo_url.startsWith('data:image')) {
            sampleStats.base64Count++;
            const base64Match = pet.photo_url.match(/^data:image\/\w+;base64,(.+)$/);
            if (base64Match) {
              const size = Buffer.from(base64Match[1], 'base64').length;
              sampleStats.sizes.push(size);
              sampleStats.averageSize += size;
            }
          } else if (pet.photo_url.startsWith('http')) {
            sampleStats.urlCount++;
          }
        }
      }

      if (sampleStats.sizes.length > 0) {
        sampleStats.averageSize = Math.round(sampleStats.averageSize / sampleStats.sizes.length);
      }
    }

    return NextResponse.json({
      success: true,
      totalWithImages: count || 0,
      sampleStats
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get image stats' },
      { status: 500 }
    );
  }
}

