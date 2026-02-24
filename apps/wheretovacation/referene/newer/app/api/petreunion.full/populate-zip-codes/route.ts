import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface ZipCodeInput {
  zip: string;
  city: string;
  state: string;
  stateCode: string;
  lat?: number;
  lon?: number;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Quick test: Check if table exists and get current count
    let initialCount = 0;
    const { count, error: initialError } = await supabase
      .from('zip_codes')
      .select('*', { count: 'exact', head: true });

    if (!initialError && count !== null) {
      initialCount = count;
    }

    console.log(`[DEBUG] Initial ZIP codes count: ${initialCount}, error: ${initialError?.message || 'none'}`);

    const body = await request.json();
    const { zipCodes } = body as { zipCodes: ZipCodeInput[] };

    if (!Array.isArray(zipCodes)) {
      return NextResponse.json(
        { error: 'zipCodes must be an array' },
        { status: 400 }
      );
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const zipData of zipCodes) {
      try {
        const zipCodeData = {
          zip_code: zipData.zip,
          city: zipData.city,
          state: zipData.state,
          state_code: zipData.stateCode,
          latitude: zipData.lat || null,
          longitude: zipData.lon || null,
          updated_at: new Date().toISOString()
        };

        // Try to insert first (upsert approach)
        // Use upsert with ON CONFLICT to handle both insert and update
        const { data: upsertData, error: upsertError } = await supabase
          .from('zip_codes')
          .upsert(zipCodeData, {
            onConflict: 'zip_code',
            ignoreDuplicates: false
          })
          .select();

        if (upsertError) {
          console.log(`[DEBUG] Upsert error for ${zipData.zip}:`, JSON.stringify(upsertError, null, 2));

          // If schema cache error, use REST API directly (bypasses PostgREST cache)
          if (upsertError.message?.includes('schema cache') || upsertError.message?.includes('Could not find the table')) {
            // Use Supabase REST API directly with service role key
            // This bypasses the schema cache issue
            try {
              // First check if exists
              const checkResponse = await fetch(
                `${supabaseUrl}/rest/v1/zip_codes?zip_code=eq.${zipData.zip}&select=id`,
                {
                  method: 'GET',
                  headers: {
                    'apikey': supabaseServiceKey!,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const existing = await checkResponse.json();
              const exists = Array.isArray(existing) && existing.length > 0;

              if (exists) {
                // Update
                const updateResponse = await fetch(
                  `${supabaseUrl}/rest/v1/zip_codes?zip_code=eq.${zipData.zip}`,
                  {
                    method: 'PATCH',
                    headers: {
                      'apikey': supabaseServiceKey!,
                      'Authorization': `Bearer ${supabaseServiceKey}`,
                      'Content-Type': 'application/json',
                      'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(zipCodeData)
                  }
                );

                if (updateResponse.ok) {
                  updated++;
                  continue;
                } else {
                  console.error(`REST update failed for ${zipData.zip}`);
                  skipped++;
                  continue;
                }
              } else {
                // Insert
                const insertResponse = await fetch(
                  `${supabaseUrl}/rest/v1/zip_codes`,
                  {
                    method: 'POST',
                    headers: {
                      'apikey': supabaseServiceKey!,
                      'Authorization': `Bearer ${supabaseServiceKey}`,
                      'Content-Type': 'application/json',
                      'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(zipCodeData)
                  }
                );

                if (insertResponse.ok) {
                  added++;
                  continue;
                } else {
                  const errorText = await insertResponse.text();
                  console.error(`REST insert failed for ${zipData.zip}:`, errorText);
                  skipped++;
                  continue;
                }
              }
            } catch (restError: any) {
              console.error(`REST API error for ${zipData.zip}:`, restError.message);
              skipped++;
              continue;
            }
          }

          // Try the old way: check then insert/update
          console.log(`[DEBUG] Trying fallback method for ${zipData.zip}`);
          const { data: existing, error: checkError } = await supabase
            .from('zip_codes')
            .select('id')
            .eq('zip_code', zipData.zip)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error(`[DEBUG] Check error for ${zipData.zip}:`, checkError.message, checkError.code);
            const errorMsg = `Check failed for ${zipData.zip}: ${checkError.message} (${checkError.code})`;
            errors.push(errorMsg);
            // If it's a schema cache error, try REST API fallback
            if (checkError.message?.includes('schema cache') || checkError.message?.includes('Could not find the table')) {
              // Try REST API as last resort
              console.log(`[DEBUG] Attempting REST API for ${zipData.zip} due to schema cache`);
              // (REST API code would go here, but it's already above)
              skipped++;
              continue;
            } else {
              console.error(`Error checking ZIP ${zipData.zip}:`, checkError);
              skipped++;
              continue;
            }
          }

          if (existing) {
            // Update existing
            const { error: updateError } = await supabase
              .from('zip_codes')
              .update(zipCodeData)
              .eq('id', existing.id);

            if (updateError) {
              console.error(`[DEBUG] Update error for ${zipData.zip}:`, updateError.message, updateError.code);
              skipped++;
            } else {
              console.log(`[DEBUG] Successfully updated ${zipData.zip}`);
              updated++;
            }
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('zip_codes')
              .insert(zipCodeData);

            if (insertError) {
              console.error(`[DEBUG] Insert error for ${zipData.zip}:`, insertError.message, insertError.code);
              skipped++;
            } else {
              console.log(`[DEBUG] Successfully inserted ${zipData.zip}`);
              added++;
            }
          }
        } else {
          // Upsert succeeded - count as added (for initial population, upsert = insert)
          console.log(`[DEBUG] Upsert succeeded for ${zipData.zip}`, upsertData ? `Data returned: ${upsertData.length} rows` : 'No data returned (but no error)');
          // For initial population, assume upsert = insert
          // If data is returned, definitely worked. If no data but no error, also assume it worked.
          added++;
        }
      } catch (error: any) {
        const errorMsg = `Exception processing ${zipData.zip}: ${error.message}`;
        console.error(`[DEBUG] ${errorMsg}`);
        errors.push(errorMsg);
        skipped++;
      }
    }

    // Verify actual count in database
    let actualCount = 0;
    try {
      const { count, error: countError } = await supabase
        .from('zip_codes')
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        actualCount = count || 0;
      }
    } catch (e) {
      // Ignore count errors
    }

    const summary = {
      success: true,
      added,
      updated,
      skipped,
      total: zipCodes.length,
      initialCount,
      finalCount: actualCount,
      actualCountInDatabase: actualCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : null, // Show first 10 errors
      errorCount: errors.length,
      note: skipped > 0 ? 'Some ZIP codes may have been skipped due to errors. Check server logs for details.' : null
    };

    console.log(`[DEBUG] Summary:`, JSON.stringify(summary, null, 2));

    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('Error populating ZIP codes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to populate ZIP codes' },
      { status: 500 }
    );
  }
}

