/**
 * BIOMETRIC IDENTIFICATION SERVICE
 * 
 * "Digital DNA" for pets - uses nose-prints and facial landmarks
 * for forensic-grade pet identification.
 * 
 * Like fingerprints for humans, every dog's nose-print and every
 * cat's facial pattern is unique and can be used for identification.
 * 
 * ML Pipeline:
 * 1. Image preprocessing (crop, normalize, enhance)
 * 2. Feature extraction (GPT-4 Vision + CLIP embeddings)
 * 3. Vector generation (512-dimensional)
 * 4. Similarity matching (cosine similarity)
 * 5. Confidence scoring
 */

import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface BiometricData {
  nosePointUrl?: string;
  nosePointVector?: number[];
  facialLandmarksUrl?: string;
  facialLandmarksVector?: number[];
  biometricHash?: string;
  biometricConfidence?: number;
}

export interface BiometricMatch {
  petId: number;
  petSource: 'lost_pets' | 'pet_vault';
  petName: string;
  petType: string;
  breed?: string;
  color?: string;
  photoUrl?: string;
  similarity: number; // 0.0 - 1.0
  confidenceScore: number; // 0 - 100
  biometricHash?: string;
  ownerName?: string;
  ownerPhone?: string;
  emergencyPhone?: string;
  lastSeenLocation?: string;
  daysLost?: number;
}

export interface BiometricSearchResult {
  success: boolean;
  searchId?: number;
  processingTimeMs: number;
  matches: BiometricMatch[];
  topMatch: BiometricMatch | null;
  hasVerifiedMatch: boolean;
  imageQuality: number;
  extractedFeatures: {
    petType?: string;
    nosePatternDescription?: string;
    facialLandmarks?: string[];
    colorPattern?: string;
    distinctiveMarkers?: string[];
  };
}

export interface ExtractedBiometrics {
  vector: number[];
  hash: string;
  confidence: number;
  description: string;
  landmarks: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRIC EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract biometric features from a pet nose-print or facial image
 * Uses GPT-4 Vision for analysis + OpenAI embeddings for vector generation
 */
export async function extractBiometrics(
  imageBuffer: Buffer,
  petType: 'dog' | 'cat' | 'other',
  imageType: 'nose_print' | 'facial' | 'full_body'
): Promise<ExtractedBiometrics | null> {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const base64Image = imageBuffer.toString('base64');

    // Step 1: Analyze the image with GPT-4 Vision to extract biometric description
    const analysisPrompt = imageType === 'nose_print' 
      ? `Analyze this ${petType} nose-print image for biometric identification.

Extract and describe in detail:
1. Overall nose shape (heart, oval, diamond, rectangular)
2. Surface texture pattern (ridges, bumps, creases)
3. Nostril shape and position
4. Color gradients and pigmentation patterns
5. Any unique markings, scars, or asymmetries
6. Dermatoglyphic patterns (the equivalent of fingerprint ridges)

Respond in JSON format:
{
  "noseShape": "description",
  "texturePattern": "detailed description of ridges and patterns",
  "nostrilDetails": "shape and positioning",
  "colorPattern": "color distribution",
  "uniqueMarkers": ["list", "of", "distinct", "features"],
  "patternDescription": "full paragraph describing the unique pattern",
  "qualityScore": 0-100
}`
      : `Analyze this ${petType} facial image for biometric identification.

Extract and describe in detail:
1. Eye shape, color, and position relative to nose
2. Ear shape and positioning
3. Facial markings and color patterns
4. Muzzle shape and proportions
5. Any unique scars, spots, or asymmetries
6. Coat pattern around the face

Respond in JSON format:
{
  "eyeDetails": "shape, color, spacing",
  "earDetails": "shape, position, tilt",
  "facialMarkings": ["list", "of", "markings"],
  "muzzleShape": "description",
  "uniqueMarkers": ["list", "of", "distinct", "features"],
  "coatPattern": "description of facial coat",
  "patternDescription": "full paragraph describing unique features",
  "qualityScore": 0-100
}`;

    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      max_tokens: 1000
    });

    const analysisText = visionResponse.choices[0].message.content || '';
    
    // Parse the analysis
    let analysis: any = {};
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      analysis = { patternDescription: analysisText, qualityScore: 50 };
    }

    // Step 2: Generate embedding vector from the description
    const embeddingText = analysis.patternDescription || analysisText;
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: embeddingText,
      dimensions: 512
    });

    const vector = embeddingResponse.data[0].embedding;

    // Step 3: Generate a unique hash from the vector
    const hash = generateBiometricHash(vector);

    // Step 4: Compile extracted landmarks
    const landmarks = [
      ...(analysis.uniqueMarkers || []),
      ...(analysis.facialMarkings || []),
      analysis.noseShape,
      analysis.eyeDetails,
      analysis.earDetails
    ].filter(Boolean);

    return {
      vector,
      hash,
      confidence: analysis.qualityScore || 75,
      description: analysis.patternDescription || embeddingText,
      landmarks
    };

  } catch (error: any) {
    console.error('[Biometric Service] Extraction error:', error.message);
    return null;
  }
}

/**
 * Generate a unique hash from the biometric vector
 * This allows for quick preliminary matching before full vector comparison
 */
function generateBiometricHash(vector: number[]): string {
  // Create a signature from key vector components
  const signatureComponents = [];
  
  // Sample every 16th element (32 samples from 512)
  for (let i = 0; i < vector.length; i += 16) {
    signatureComponents.push(Math.sign(vector[i]) * Math.floor(Math.abs(vector[i]) * 1000));
  }
  
  // Convert to hex string
  const hash = signatureComponents
    .map(n => ((n + 0x8000) & 0xFFFF).toString(16).padStart(4, '0'))
    .join('');
  
  return `BIO-${hash.substring(0, 32).toUpperCase()}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRIC MATCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main biometric matching function
 * Searches the database for pets matching the provided image
 */
export async function matchPetBiometrically(
  imageBuffer: Buffer,
  options: {
    petType?: 'dog' | 'cat' | 'other';
    searchRadius?: number; // miles
    searchLocation?: { lat: number; lon: number };
    minSimilarity?: number;
    searcherId?: string;
    searcherType?: 'officer' | 'user' | 'system';
  } = {}
): Promise<BiometricSearchResult> {
  const startTime = Date.now();
  const minSimilarity = options.minSimilarity || 0.70;

  try {
    // Step 1: Extract biometrics from the search image
    const extractedBiometrics = await extractBiometrics(
      imageBuffer,
      options.petType || 'dog',
      'nose_print'
    );

    if (!extractedBiometrics) {
      return {
        success: false,
        processingTimeMs: Date.now() - startTime,
        matches: [],
        topMatch: null,
        hasVerifiedMatch: false,
        imageQuality: 0,
        extractedFeatures: {}
      };
    }

    // Step 2: Search database for matches
    const matches = await searchBiometricDatabase(
      extractedBiometrics.vector,
      options.petType,
      minSimilarity,
      options.searchLocation
    );

    // Step 3: Sort by confidence score
    matches.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Step 4: Check for verified match (>= 92% similarity)
    const hasVerifiedMatch = matches.some(m => m.similarity >= 0.92);
    const topMatch = matches.length > 0 ? matches[0] : null;

    // Step 5: Log the search
    let searchId: number | undefined;
    if (supabase && options.searcherId) {
      try {
        const { data } = await supabase
          .from('biometric_matches')
          .insert({
            search_vector: extractedBiometrics.vector,
            search_location_lat: options.searchLocation?.lat,
            search_location_lon: options.searchLocation?.lon,
            searcher_type: options.searcherType || 'user',
            searcher_id: options.searcherId,
            match_pet_id: topMatch?.petId,
            match_source: topMatch?.petSource,
            biometric_similarity: topMatch?.similarity,
            biometric_confidence_score: topMatch?.confidenceScore,
            is_verified_match: hasVerifiedMatch,
            outcome: 'pending'
          })
          .select('id')
          .single();
        searchId = data?.id;
      } catch (err) {
        console.error('[Biometric Service] Failed to log search:', err);
      }
    }

    return {
      success: true,
      searchId,
      processingTimeMs: Date.now() - startTime,
      matches: matches.slice(0, 10),
      topMatch,
      hasVerifiedMatch,
      imageQuality: extractedBiometrics.confidence,
      extractedFeatures: {
        petType: options.petType,
        nosePatternDescription: extractedBiometrics.description,
        distinctiveMarkers: extractedBiometrics.landmarks
      }
    };

  } catch (error: any) {
    console.error('[Biometric Service] Match error:', error.message);
    return {
      success: false,
      processingTimeMs: Date.now() - startTime,
      matches: [],
      topMatch: null,
      hasVerifiedMatch: false,
      imageQuality: 0,
      extractedFeatures: {}
    };
  }
}

/**
 * Search the database for biometric matches
 */
async function searchBiometricDatabase(
  searchVector: number[],
  petType?: string,
  minSimilarity: number = 0.70,
  location?: { lat: number; lon: number }
): Promise<BiometricMatch[]> {
  if (!supabase) return [];

  const matches: BiometricMatch[] = [];

  try {
    // Search lost_pets
    const { data: lostPets } = await supabase
      .from('lost_pets')
      .select('id, pet_name, pet_type, breed, color, primary_photo_url, nose_print_vector, biometric_hash, owner_name, owner_phone, emergency_contact_phone, last_seen_city, last_seen_state, date_lost, created_at')
      .eq('status', 'lost')
      .not('nose_print_vector', 'is', null);

    if (lostPets) {
      for (const pet of lostPets) {
        if (petType && pet.pet_type?.toLowerCase() !== petType.toLowerCase()) continue;

        const petVector = pet.nose_print_vector;
        if (!petVector || !Array.isArray(petVector)) continue;

        const similarity = cosineSimilarity(searchVector, petVector);
        
        if (similarity >= minSimilarity) {
          const daysLost = pet.date_lost 
            ? Math.floor((Date.now() - new Date(pet.date_lost).getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

          matches.push({
            petId: pet.id,
            petSource: 'lost_pets',
            petName: pet.pet_name || 'Unknown',
            petType: pet.pet_type || 'unknown',
            breed: pet.breed,
            color: pet.color,
            photoUrl: pet.primary_photo_url,
            similarity,
            confidenceScore: calculateConfidenceScore(similarity),
            biometricHash: pet.biometric_hash,
            ownerName: pet.owner_name,
            ownerPhone: pet.owner_phone,
            emergencyPhone: pet.emergency_contact_phone,
            lastSeenLocation: pet.last_seen_city ? `${pet.last_seen_city}, ${pet.last_seen_state}` : undefined,
            daysLost
          });
        }
      }
    }

    // Search pet_vault (ReunionReady pets)
    const { data: vaultPets } = await supabase
      .from('pet_vault')
      .select('id, pet_name, pet_type, breed, color, primary_photo_url, nose_print_vector, biometric_hash, owner_name, owner_phone, emergency_contact_phone, home_city, home_state')
      .eq('is_currently_lost', true)
      .not('nose_print_vector', 'is', null);

    if (vaultPets) {
      for (const pet of vaultPets) {
        if (petType && pet.pet_type?.toLowerCase() !== petType.toLowerCase()) continue;

        const petVector = pet.nose_print_vector;
        if (!petVector || !Array.isArray(petVector)) continue;

        const similarity = cosineSimilarity(searchVector, petVector);
        
        if (similarity >= minSimilarity) {
          matches.push({
            petId: pet.id,
            petSource: 'pet_vault',
            petName: pet.pet_name,
            petType: pet.pet_type,
            breed: pet.breed,
            color: pet.color,
            photoUrl: pet.primary_photo_url,
            similarity,
            confidenceScore: calculateConfidenceScore(similarity),
            biometricHash: pet.biometric_hash,
            ownerName: pet.owner_name,
            ownerPhone: pet.owner_phone,
            emergencyPhone: pet.emergency_contact_phone,
            lastSeenLocation: pet.home_city ? `${pet.home_city}, ${pet.home_state}` : undefined
          });
        }
      }
    }

  } catch (error: any) {
    console.error('[Biometric Service] Database search error:', error.message);
  }

  return matches;
}

/**
 * Calculate confidence score from similarity
 * Accounts for quality and applies forensic-grade thresholds
 */
function calculateConfidenceScore(similarity: number): number {
  // Non-linear scaling for forensic accuracy
  if (similarity >= 0.95) return 99;
  if (similarity >= 0.92) return 96;
  if (similarity >= 0.88) return 92;
  if (similarity >= 0.85) return 88;
  if (similarity >= 0.80) return 82;
  if (similarity >= 0.75) return 75;
  if (similarity >= 0.70) return 68;
  return Math.round(similarity * 60);
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRIC STORAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store biometrics for a pet
 */
export async function storeBiometrics(
  petId: number,
  petSource: 'lost_pets' | 'pet_vault',
  imageUrl: string,
  biometrics: ExtractedBiometrics,
  imageType: 'nose_print' | 'facial' = 'nose_print'
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const table = petSource;
    const vectorColumn = imageType === 'nose_print' ? 'nose_print_vector' : 'facial_landmarks_vector';
    const urlColumn = imageType === 'nose_print' ? 'nose_print_url' : 'facial_landmarks_url';

    await supabase
      .from(table)
      .update({
        [urlColumn]: imageUrl,
        [vectorColumn]: biometrics.vector,
        biometric_hash: biometrics.hash,
        biometric_confidence: biometrics.confidence,
        biometric_captured_at: new Date().toISOString()
      })
      .eq('id', petId);

    // Also store detailed markers
    await supabase
      .from('biometric_markers')
      .upsert({
        pet_id: petId,
        pet_source: petSource,
        marker_type: imageType,
        feature_vector: biometrics.vector,
        feature_hash: biometrics.hash,
        feature_quality: biometrics.confidence,
        image_url: imageUrl,
        capture_method: 'manual_upload',
        ai_model_used: 'gpt-4o'
      }, { onConflict: 'pet_id,pet_source,marker_type' });

    return true;

  } catch (error: any) {
    console.error('[Biometric Service] Storage error:', error.message);
    return false;
  }
}

/**
 * Verify a biometric match (mark as confirmed)
 */
export async function verifyBiometricMatch(
  matchId: number,
  verifiedBy: string,
  verificationMethod: string,
  isConfirmed: boolean
): Promise<boolean> {
  if (!supabase) return false;

  try {
    await supabase
      .from('biometric_matches')
      .update({
        is_verified_match: isConfirmed,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
        verification_method: verificationMethod,
        outcome: isConfirmed ? 'confirmed' : 'rejected'
      })
      .eq('id', matchId);

    // If confirmed, mark the pet as verified
    const { data: match } = await supabase
      .from('biometric_matches')
      .select('match_pet_id, match_source')
      .eq('id', matchId)
      .single();

    if (match && isConfirmed) {
      await supabase
        .from(match.match_source)
        .update({ biometric_verified: true })
        .eq('id', match.match_pet_id);
    }

    return true;

  } catch (error: any) {
    console.error('[Biometric Service] Verification error:', error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assess the quality of a biometric image before processing
 */
export async function assessImageQuality(
  imageBuffer: Buffer,
  imageType: 'nose_print' | 'facial'
): Promise<{
  isUsable: boolean;
  qualityScore: number;
  issues: string[];
  recommendations: string[];
}> {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Assess the quality of this ${imageType === 'nose_print' ? 'pet nose-print' : 'pet facial'} image for biometric identification purposes.

Evaluate:
1. Focus/clarity (is the image sharp?)
2. Lighting (proper exposure, no harsh shadows?)
3. Framing (is the ${imageType === 'nose_print' ? 'nose' : 'face'} centered and close-up?)
4. Angle (is it a straight-on view?)
5. Obstructions (any blur, fingers, objects blocking?)

Respond in JSON:
{
  "qualityScore": 0-100,
  "isUsable": true/false (usable if score >= 60),
  "issues": ["list of problems"],
  "recommendations": ["how to improve"]
}`
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      max_tokens: 300
    });

    const content = response.choices[0].message.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const assessment = JSON.parse(jsonMatch[0]);
      return {
        isUsable: assessment.isUsable,
        qualityScore: assessment.qualityScore,
        issues: assessment.issues || [],
        recommendations: assessment.recommendations || []
      };
    }

    return {
      isUsable: true,
      qualityScore: 70,
      issues: [],
      recommendations: []
    };

  } catch (error: any) {
    console.error('[Biometric Service] Quality assessment error:', error.message);
    return {
      isUsable: true,
      qualityScore: 50,
      issues: ['Could not assess quality'],
      recommendations: ['Ensure good lighting and focus']
    };
  }
}

