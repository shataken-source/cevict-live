import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PetImportRow {
  pet_name?: string;
  pet_type?: string;
  breed?: string;
  color?: string;
  size?: string;
  photo_url?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  age?: string;
  gender?: string;
  description?: string;
  markings?: string;
  microchip?: string;
  collar?: string;
  status?: string;
  date_lost?: string;
  date_found?: string;
  [key: string]: any; // Allow other fields
}

// Normalize field names (handle variations)
function normalizeFieldName(field: string): string {
  const normalized = field.toLowerCase().trim().replace(/[_\s-]/g, '_');
  
  const fieldMap: Record<string, string> = {
    'name': 'pet_name',
    'petname': 'pet_name',
    'animal_name': 'pet_name',
    'type': 'pet_type',
    'animal_type': 'pet_type',
    'dog_or_cat': 'pet_type',
    'breed': 'breed',
    'color': 'color',
    'colour': 'color',
    'size': 'size',
    'photo': 'photo_url',
    'photo_url': 'photo_url',
    'image': 'photo_url',
    'image_url': 'photo_url',
    'picture': 'photo_url',
    'city': 'location_city',
    'location_city': 'location_city',
    'state': 'location_state',
    'location_state': 'location_state',
    'zip': 'location_zip',
    'zipcode': 'location_zip',
    'zip_code': 'location_zip',
    'postal_code': 'location_zip',
    'age': 'age',
    'gender': 'gender',
    'sex': 'gender',
    'description': 'description',
    'desc': 'description',
    'notes': 'description',
    'markings': 'markings',
    'distinctive_markings': 'markings',
    'microchip': 'microchip',
    'microchip_number': 'microchip',
    'chip': 'microchip',
    'collar': 'collar',
    'wearing_collar': 'collar',
    'status': 'status',
    'availability': 'status',
    'date_lost': 'date_lost',
    'lost_date': 'date_lost',
    'date_found': 'date_found',
    'found_date': 'date_found',
    'intake_date': 'date_found',
  };
  
  return fieldMap[normalized] || normalized;
}

// Normalize pet type
function normalizePetType(value: string): 'dog' | 'cat' {
  const lower = value.toLowerCase().trim();
  if (lower.includes('dog') || lower === 'd' || lower === 'canine') return 'dog';
  if (lower.includes('cat') || lower === 'c' || lower === 'feline') return 'cat';
  return 'dog'; // Default
}

// Normalize status
function normalizeStatus(value: string): 'lost' | 'found' {
  const lower = value.toLowerCase().trim();
  if (lower.includes('found') || lower.includes('available') || lower.includes('adopt') || lower === 'f') return 'found';
  if (lower.includes('lost') || lower.includes('missing') || lower === 'l') return 'lost';
  return 'found'; // Default for shelters
}

// Validate and normalize a pet row
function validateAndNormalize(row: PetImportRow, rowIndex: number): { valid: boolean; pet: any; errors: string[] } {
  const errors: string[] = [];
  const pet: any = {};

  // Required fields
  if (!row.pet_type && !row.type) {
    errors.push(`Row ${rowIndex + 1}: Missing pet_type (dog or cat)`);
  } else {
    pet.pet_type = normalizePetType(row.pet_type || row.type || '');
  }

  if (!row.breed) {
    errors.push(`Row ${rowIndex + 1}: Missing breed`);
  } else {
    pet.breed = String(row.breed).trim();
  }

  if (!row.color) {
    errors.push(`Row ${rowIndex + 1}: Missing color`);
  } else {
    pet.color = String(row.color).trim();
  }

  if (!row.location_city && !row.city) {
    errors.push(`Row ${rowIndex + 1}: Missing location_city`);
  } else {
    pet.location_city = String(row.location_city || row.city || '').trim();
  }

  if (!row.location_state && !row.state) {
    errors.push(`Row ${rowIndex + 1}: Missing location_state`);
  } else {
    pet.location_state = String(row.location_state || row.state || '').trim();
  }

  // Optional but recommended
  pet.pet_name = row.pet_name ? String(row.pet_name).trim() : null;
  pet.size = row.size ? String(row.size).trim().toLowerCase() : null;
  pet.photo_url = row.photo_url ? String(row.photo_url).trim() : null;
  pet.location_zip = row.location_zip || row.zip ? String(row.location_zip || row.zip || '').trim() : null;
  pet.age = row.age ? String(row.age).trim() : null;
  pet.gender = row.gender || row.sex ? String(row.gender || row.sex || '').trim().toLowerCase() : null;
  pet.description = row.description ? String(row.description).trim() : null;
  pet.markings = row.markings ? String(row.markings).trim() : null;
  pet.microchip = row.microchip ? String(row.microchip).trim() : null;
  pet.collar = row.collar ? String(row.collar).trim().toLowerCase() : null;
  pet.status = normalizeStatus(row.status || 'found');
  pet.date_lost = row.date_lost ? String(row.date_lost).trim() : null;
  pet.date_found = row.date_found || row.intake_date ? String(row.date_found || row.intake_date || '').trim() : null;

  // Set default date if missing
  if (!pet.date_lost && !pet.date_found) {
    pet.date_lost = new Date().toISOString().split('T')[0];
  }

  return {
    valid: errors.length === 0,
    pet,
    errors
  };
}

// Parse CSV content
function parseCSV(content: string): PetImportRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => normalizeFieldName(h.trim()));
  
  // Parse rows
  const rows: PetImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: PetImportRow = {};
    
    headers.forEach((header, index) => {
      if (values[index]) {
        row[header] = values[index];
      }
    });
    
    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
  }
  
  return rows;
}

// Parse JSON content
function parseJSON(content: string): PetImportRow[] {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }
    // If it's an object with a pets array
    if (data.pets && Array.isArray(data.pets)) {
      return data.pets;
    }
    return [];
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pets, shelter_id, format = 'json' } = body;

    if (!shelter_id) {
      return NextResponse.json(
        { error: 'Shelter ID is required' },
        { status: 400 }
      );
    }

    if (!pets || !Array.isArray(pets) || pets.length === 0) {
      return NextResponse.json(
        { error: 'Pets array is required and must not be empty' },
        { status: 400 }
      );
    }

    console.log(`[BULK IMPORT] Starting import for shelter ${shelter_id}, ${pets.length} pets`);

    // Validate and normalize all pets
    const validatedPets: any[] = [];
    const errors: string[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < pets.length; i++) {
      const row = pets[i];
      const result = validateAndNormalize(row, i);

      if (result.valid) {
        // Add shelter_id and owner info
        validatedPets.push({
          ...result.pet,
          shelter_id,
          owner_name: 'Shelter',
          owner_email: null,
          owner_phone: null,
          source: 'bulk_import',
          created_at: new Date().toISOString()
        });
      } else {
        errors.push(...result.errors);
        skipped.push(`Row ${i + 1}: ${result.errors.join(', ')}`);
      }
    }

    if (validatedPets.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid pets to import',
          errors,
          skipped
        },
        { status: 400 }
      );
    }

    console.log(`[BULK IMPORT] Validated ${validatedPets.length} pets, ${errors.length} errors`);

    // Import in batches to avoid overwhelming the database
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < validatedPets.length; i += batchSize) {
      batches.push(validatedPets.slice(i, i + batchSize));
    }

    let totalInserted = 0;
    let totalErrors = 0;
    const insertErrors: string[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        // Check for duplicates first (by name, breed, color, and shelter)
        const { data: existingPets } = await supabase
          .from('lost_pets')
          .select('id, pet_name, breed, color')
          .eq('shelter_id', shelter_id);

        // Filter out duplicates
        const newPets = batch.filter(pet => {
          if (!existingPets) return true;
          return !existingPets.some(existing => 
            existing.pet_name === pet.pet_name &&
            existing.breed === pet.breed &&
            existing.color === pet.color
          );
        });

        if (newPets.length === 0) {
          console.log(`[BULK IMPORT] Batch ${batchIndex + 1}: All pets already exist, skipping`);
          continue;
        }

        const { data: inserted, error: insertError } = await supabase
          .from('lost_pets')
          .insert(newPets)
          .select();

        if (insertError) {
          console.error(`[BULK IMPORT] Batch ${batchIndex + 1} error:`, insertError);
          insertErrors.push(`Batch ${batchIndex + 1}: ${insertError.message}`);
          totalErrors += batch.length;
        } else {
          totalInserted += inserted?.length || 0;
          console.log(`[BULK IMPORT] Batch ${batchIndex + 1}: Inserted ${inserted?.length || 0} pets`);
        }
      } catch (batchError: any) {
        console.error(`[BULK IMPORT] Batch ${batchIndex + 1} exception:`, batchError);
        insertErrors.push(`Batch ${batchIndex + 1}: ${batchError.message}`);
        totalErrors += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: pets.length,
        imported: totalInserted,
        skipped: skipped.length,
        errors: errors.length + insertErrors.length,
        duplicates: validatedPets.length - totalInserted - totalErrors
      },
      errors: errors.length > 0 ? errors.slice(0, 20) : [], // Limit error output
      insertErrors: insertErrors.length > 0 ? insertErrors.slice(0, 20) : [],
      skipped: skipped.length > 0 ? skipped.slice(0, 20) : [],
      message: `Imported ${totalInserted} pets successfully. ${errors.length} validation errors, ${insertErrors.length} insert errors.`
    });

  } catch (error: any) {
    console.error('[BULK IMPORT] Error:', error);
    return NextResponse.json(
      { 
        error: 'Bulk import failed', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to parse file content (for preview)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const content = searchParams.get('content');
    const format = searchParams.get('format') || 'json';

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    let pets: PetImportRow[] = [];

    if (format === 'csv') {
      pets = parseCSV(content);
    } else if (format === 'json') {
      pets = parseJSON(content);
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use "csv" or "json"' },
        { status: 400 }
      );
    }

    // Validate all pets and return preview
    const preview = pets.slice(0, 10).map((row, index) => {
      const result = validateAndNormalize(row, index);
      return {
        row: index + 1,
        valid: result.valid,
        pet: result.pet,
        errors: result.errors
      };
    });

    return NextResponse.json({
      success: true,
      totalRows: pets.length,
      preview,
      sample: pets[0] || null
    });

  } catch (error: any) {
    console.error('[BULK IMPORT] Parse error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse file', 
        message: error.message
      },
      { status: 400 }
    );
  }
}


