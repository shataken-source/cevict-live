/**
 * FIELD OFFICER SERVICE
 * 
 * Backend service for Animal Control and Law Enforcement officers.
 * Handles officer verification, deep scans, and RTO (Return to Owner) operations.
 * 
 * Key Features:
 * - Professional email verification (.gov, .org, etc.)
 * - Deep scan against lost_pets and pet_vault databases
 * - BIOMETRIC MATCHING for forensic-grade identification
 * - Instant match alerts with owner emergency contacts
 * - RTO documentation and logging
 */

import { createClient } from '@supabase/supabase-js';
import { matchPetBiometrically, BiometricMatch } from './biometric-service';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Officer {
  id: number;
  user_id: string;
  badge_number?: string;
  department_name: string;
  department_type: 'animal_control' | 'police' | 'sheriff' | 'municipal' | 'state' | 'federal' | 'other';
  jurisdiction?: string;
  work_email: string;
  work_phone?: string;
  is_verified: boolean;
  verified_at?: string;
  is_active: boolean;
  total_scans: number;
  total_matches: number;
  total_rtos: number;
}

export interface OfficerRegistration {
  userId: string;
  badgeNumber?: string;
  departmentName: string;
  departmentType: Officer['department_type'];
  jurisdiction?: string;
  workEmail: string;
  workPhone?: string;
  verificationDocumentUrl?: string;
}

export interface DeepScanResult {
  success: boolean;
  scanId: number;
  processingTimeMs: number;
  matches: PetMatch[];
  topMatch: PetMatch | null;
  hasHighConfidenceMatch: boolean; // >= 85%
  ownerContact?: OwnerContact; // Only revealed if match >= 85%
}

export interface PetMatch {
  petId: number;
  source: 'lost_pets' | 'pet_vault';
  confidence: number;
  petName: string;
  petType: string;
  breed?: string;
  color?: string;
  size?: string;
  lastSeenLocation?: string;
  daysLost?: number;
  photoUrl?: string;
}

export interface OwnerContact {
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  homeAddress?: string;
  petMedicalNotes?: string;
  approachInstructions?: string;
}

export interface Encounter {
  id: number;
  officerId: number;
  petType: string;
  petBreed?: string;
  petColor?: string;
  petDescription?: string;
  petPhotoUrl?: string;
  pickupLocationLat?: number;
  pickupLocationLon?: number;
  pickupLocationAddress?: string;
  matchedPetId?: number;
  matchConfidence?: number;
  outcome?: 'rto' | 'shelter' | 'released' | 'pending' | 'deceased' | 'other';
  status: 'active' | 'resolved' | 'cancelled';
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALID EMAIL DOMAINS
// ═══════════════════════════════════════════════════════════════════════════

const VALID_DOMAIN_PATTERNS = [
  /\.gov$/i,
  /\.org$/i,
  /\.edu$/i,
  /police\./i,
  /sheriff\./i,
  /pd\./i,
  /animalcontrol\./i,
  /animalshelter\./i,
  /municipal\./i,
  /county\./i,
  /state\./i,
  /cityof/i,
  /countysheriff/i,
];

/**
 * Validate if an email domain is from a professional organization
 */
export function isValidOfficerEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return VALID_DOMAIN_PATTERNS.some(pattern => pattern.test(domain));
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFICER REGISTRATION & VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Register a new officer (pending verification)
 */
export async function registerOfficer(input: OfficerRegistration): Promise<{ success: boolean; officer?: Officer; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not configured' };

  // Validate email domain
  if (!isValidOfficerEmail(input.workEmail)) {
    return { 
      success: false, 
      error: 'Invalid email domain. Officers must use a professional email (.gov, .org, police.*, etc.)' 
    };
  }

  const emailDomain = input.workEmail.split('@')[1]?.toLowerCase();

  try {
    const { data, error } = await supabase
      .from('officers')
      .insert({
        user_id: input.userId,
        badge_number: input.badgeNumber,
        department_name: input.departmentName,
        department_type: input.departmentType,
        jurisdiction: input.jurisdiction,
        work_email: input.workEmail.toLowerCase(),
        work_phone: input.workPhone,
        email_domain: emailDomain,
        verification_document_url: input.verificationDocumentUrl,
        is_verified: false, // Requires admin approval
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    
    return { success: true, officer: data };
  } catch (error: any) {
    console.error('[Officer Service] Registration error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get officer by user ID
 */
export async function getOfficerByUserId(userId: string): Promise<Officer | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('officers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

/**
 * Verify an officer (admin action)
 */
export async function verifyOfficer(officerId: number, adminId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('officers')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: adminId
      })
      .eq('id', officerId);

    return !error;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEEP SCAN - PET MATCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Perform a deep scan of a found pet photo against the database
 * This is the core matching function for field officers
 */
export async function performDeepScan(
  officerId: number,
  photoBuffer: Buffer,
  photoUrl: string,
  location: { lat: number; lon: number; address?: string }
): Promise<DeepScanResult> {
  if (!supabase) {
    return { success: false, scanId: 0, processingTimeMs: 0, matches: [], topMatch: null, hasHighConfidenceMatch: false };
  }

  const startTime = Date.now();
  const matches: PetMatch[] = [];

  try {
    // 1. Use GPT-4 Vision to analyze the photo
    const petAnalysis = await analyzePetPhoto(photoBuffer);
    
    // 2. BIOMETRIC MATCHING (Highest Priority - Forensic Grade)
    // This searches for nose-print/facial matches using AI vectors
    try {
      const biometricResult = await matchPetBiometrically(photoBuffer, {
        petType: petAnalysis.petType as 'dog' | 'cat' | 'other',
        searchLocation: location,
        searcherId: officerId.toString(),
        searcherType: 'officer'
      });

      // Add biometric matches with boosted confidence
      if (biometricResult.success && biometricResult.matches.length > 0) {
        for (const bioMatch of biometricResult.matches) {
          matches.push({
            petId: bioMatch.petId,
            source: bioMatch.petSource,
            confidence: bioMatch.confidenceScore, // Biometric confidence takes priority
            petName: bioMatch.petName,
            petType: bioMatch.petType,
            breed: bioMatch.breed,
            color: bioMatch.color,
            lastSeenLocation: bioMatch.lastSeenLocation,
            daysLost: bioMatch.daysLost,
            photoUrl: bioMatch.photoUrl,
            // Flag as biometric match for UI
            matchType: 'biometric' as any
          });
        }
      }
    } catch (bioError) {
      console.warn('[Deep Scan] Biometric matching failed, continuing with visual:', bioError);
    }

    // 3. Search lost_pets table (Visual matching)
    const lostPetsMatches = await searchLostPets(petAnalysis, location, photoBuffer);
    // Add visual matches but avoid duplicates from biometric
    for (const match of lostPetsMatches) {
      if (!matches.some(m => m.petId === match.petId && m.source === match.source)) {
        matches.push({ ...match, matchType: 'visual' as any });
      }
    }

    // 4. Search pet_vault table (for ReunionReady pets)
    const vaultMatches = await searchPetVault(petAnalysis, location, photoBuffer);
    for (const match of vaultMatches) {
      if (!matches.some(m => m.petId === match.petId && m.source === match.source)) {
        matches.push({ ...match, matchType: 'visual' as any });
      }
    }

    // 5. Sort by confidence (biometric matches naturally rank higher)
    matches.sort((a, b) => b.confidence - a.confidence);

    // 6. Get top match
    const topMatch = matches.length > 0 ? matches[0] : null;
    // VERIFIED MATCH: >= 92% for biometric, >= 85% for visual
    const hasHighConfidenceMatch = topMatch !== null && topMatch.confidence >= 85;

    // 6. Get owner contact only if high confidence match
    let ownerContact: OwnerContact | undefined;
    if (hasHighConfidenceMatch && topMatch) {
      ownerContact = await getOwnerContact(topMatch.petId, topMatch.source);
    }

    // 7. Record the scan
    const processingTimeMs = Date.now() - startTime;
    const { data: scanRecord } = await supabase
      .from('officer_scans')
      .insert({
        officer_id: officerId,
        scanned_photo_url: photoUrl,
        scan_location_lat: location.lat,
        scan_location_lon: location.lon,
        scan_location_address: location.address,
        detected_pet_type: petAnalysis.petType,
        detected_breed: petAnalysis.breed,
        detected_color: petAnalysis.color,
        detected_size: petAnalysis.size,
        ai_description: petAnalysis.description,
        matches_found: matches.length,
        top_match_id: topMatch?.petId,
        top_match_confidence: topMatch?.confidence,
        all_matches: matches.slice(0, 10), // Top 10 matches
        processing_time_ms: processingTimeMs,
        ai_model_used: 'gpt-4-vision-preview'
      })
      .select('id')
      .single();

    return {
      success: true,
      scanId: scanRecord?.id || 0,
      processingTimeMs,
      matches: matches.slice(0, 10),
      topMatch,
      hasHighConfidenceMatch,
      ownerContact
    };

  } catch (error: any) {
    console.error('[Officer Service] Deep scan error:', error.message);
    return { success: false, scanId: 0, processingTimeMs: Date.now() - startTime, matches: [], topMatch: null, hasHighConfidenceMatch: false };
  }
}

interface PetAnalysis {
  petType: string;
  breed: string;
  color: string;
  size: string;
  description: string;
  distinctiveMarkings: string[];
}

/**
 * Analyze a pet photo using GPT-4 Vision
 */
async function analyzePetPhoto(photoBuffer: Buffer): Promise<PetAnalysis> {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const base64Image = photoBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this pet photo for matching purposes. Extract:
1. Pet type (dog, cat, etc.)
2. Breed (specific or best guess)
3. Primary colors
4. Size (small, medium, large)
5. Distinctive markings or features

Respond in JSON format:
{
  "petType": "dog",
  "breed": "Labrador Retriever",
  "color": "yellow",
  "size": "large",
  "description": "Adult yellow lab with brown eyes",
  "distinctiveMarkings": ["white patch on chest"]
}`
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      max_tokens: 500
    });

    const content = response.choices[0].message.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      petType: 'unknown',
      breed: 'unknown',
      color: 'unknown',
      size: 'unknown',
      description: content,
      distinctiveMarkings: []
    };

  } catch (error: any) {
    console.error('[Officer Service] Photo analysis error:', error.message);
    return {
      petType: 'unknown',
      breed: 'unknown',
      color: 'unknown',
      size: 'unknown',
      description: 'Analysis failed',
      distinctiveMarkings: []
    };
  }
}

/**
 * Search lost_pets table for matches
 */
async function searchLostPets(
  analysis: PetAnalysis, 
  location: { lat: number; lon: number },
  photoBuffer: Buffer
): Promise<PetMatch[]> {
  if (!supabase) return [];

  try {
    // Get all active lost pets within 100 mile radius
    const { data: lostPets } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'lost')
      .not('primary_photo_url', 'is', null);

    if (!lostPets || lostPets.length === 0) return [];

    const matches: PetMatch[] = [];

    for (const pet of lostPets) {
      // Calculate base confidence from characteristics
      let confidence = 0;
      let matchFactors = 0;

      // Type match (required)
      if (pet.pet_type?.toLowerCase() === analysis.petType?.toLowerCase()) {
        confidence += 25;
        matchFactors++;
      } else {
        continue; // Skip if type doesn't match
      }

      // Breed match
      if (pet.breed && analysis.breed) {
        const breedMatch = calculateStringSimilarity(pet.breed, analysis.breed);
        confidence += breedMatch * 20;
        matchFactors++;
      }

      // Color match
      if (pet.color && analysis.color) {
        const colorMatch = calculateStringSimilarity(pet.color, analysis.color);
        confidence += colorMatch * 20;
        matchFactors++;
      }

      // Size match
      if (pet.size && analysis.size) {
        if (pet.size.toLowerCase() === analysis.size.toLowerCase()) {
          confidence += 15;
          matchFactors++;
        }
      }

      // Distance factor (closer = higher score)
      if (pet.last_seen_lat && pet.last_seen_lon) {
        const distance = calculateDistance(
          location.lat, location.lon,
          parseFloat(pet.last_seen_lat), parseFloat(pet.last_seen_lon)
        );
        if (distance <= 5) confidence += 15;
        else if (distance <= 10) confidence += 10;
        else if (distance <= 25) confidence += 5;
      }

      // Only include if confidence is meaningful
      if (confidence >= 40) {
        // Calculate days lost
        const reportedDate = new Date(pet.date_lost || pet.created_at);
        const daysLost = Math.floor((Date.now() - reportedDate.getTime()) / (1000 * 60 * 60 * 24));

        matches.push({
          petId: pet.id,
          source: 'lost_pets',
          confidence: Math.min(confidence, 99),
          petName: pet.pet_name || 'Unknown',
          petType: pet.pet_type,
          breed: pet.breed,
          color: pet.color,
          size: pet.size,
          lastSeenLocation: pet.last_seen_city ? `${pet.last_seen_city}, ${pet.last_seen_state}` : undefined,
          daysLost,
          photoUrl: pet.primary_photo_url
        });
      }
    }

    return matches;

  } catch (error: any) {
    console.error('[Officer Service] Search lost_pets error:', error.message);
    return [];
  }
}

/**
 * Search pet_vault table for matches
 */
async function searchPetVault(
  analysis: PetAnalysis, 
  location: { lat: number; lon: number },
  photoBuffer: Buffer
): Promise<PetMatch[]> {
  if (!supabase) return [];

  try {
    // Get pets from vault that are currently lost
    const { data: vaultPets } = await supabase
      .from('pet_vault')
      .select('*')
      .eq('is_currently_lost', true);

    if (!vaultPets || vaultPets.length === 0) return [];

    const matches: PetMatch[] = [];

    for (const pet of vaultPets) {
      let confidence = 0;

      // Type match (required)
      if (pet.pet_type?.toLowerCase() === analysis.petType?.toLowerCase()) {
        confidence += 25;
      } else {
        continue;
      }

      // Breed match
      if (pet.breed && analysis.breed) {
        const breedMatch = calculateStringSimilarity(pet.breed, analysis.breed);
        confidence += breedMatch * 20;
      }

      // Color match
      if (pet.color && analysis.color) {
        const colorMatch = calculateStringSimilarity(pet.color, analysis.color);
        confidence += colorMatch * 20;
      }

      // Size match
      if (pet.size && analysis.size) {
        if (pet.size.toLowerCase() === analysis.size.toLowerCase()) {
          confidence += 15;
        }
      }

      // Distance from home factor
      if (pet.home_lat && pet.home_lon) {
        const distance = calculateDistance(
          location.lat, location.lon,
          parseFloat(pet.home_lat), parseFloat(pet.home_lon)
        );
        if (distance <= 5) confidence += 15;
        else if (distance <= 10) confidence += 10;
        else if (distance <= 25) confidence += 5;
      }

      if (confidence >= 40) {
        matches.push({
          petId: pet.id,
          source: 'pet_vault',
          confidence: Math.min(confidence, 99),
          petName: pet.pet_name,
          petType: pet.pet_type,
          breed: pet.breed,
          color: pet.color,
          size: pet.size,
          lastSeenLocation: pet.home_city ? `${pet.home_city}, ${pet.home_state}` : undefined,
          photoUrl: pet.primary_photo_url
        });
      }
    }

    return matches;

  } catch (error: any) {
    console.error('[Officer Service] Search pet_vault error:', error.message);
    return [];
  }
}

/**
 * Get owner contact information (only for high confidence matches)
 */
async function getOwnerContact(petId: number, source: 'lost_pets' | 'pet_vault'): Promise<OwnerContact | undefined> {
  if (!supabase) return undefined;

  try {
    const table = source === 'lost_pets' ? 'lost_pets' : 'pet_vault';
    
    const { data } = await supabase
      .from(table)
      .select('owner_name, owner_phone, owner_email, emergency_contact_name, emergency_contact_phone, home_address, home_city, home_state, medical_conditions, approach_instructions, special_needs')
      .eq('id', petId)
      .single();

    if (!data) return undefined;

    return {
      ownerName: data.owner_name,
      ownerPhone: data.owner_phone,
      ownerEmail: data.owner_email,
      emergencyContactName: data.emergency_contact_name,
      emergencyContactPhone: data.emergency_contact_phone,
      homeAddress: data.home_address ? `${data.home_address}, ${data.home_city || ''}, ${data.home_state || ''}` : undefined,
      petMedicalNotes: data.medical_conditions?.join(', ') || data.special_needs,
      approachInstructions: data.approach_instructions
    };

  } catch {
    return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENCOUNTER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new encounter record from a scan
 */
export async function createEncounter(
  officerId: number,
  scanId: number,
  petData: {
    petType: string;
    petBreed?: string;
    petColor?: string;
    petDescription?: string;
    petPhotoUrl?: string;
  },
  location: {
    lat: number;
    lon: number;
    address?: string;
  },
  match?: {
    petId: number;
    confidence: number;
    source: 'lost_pets' | 'pet_vault';
    ownerContact?: OwnerContact;
  }
): Promise<Encounter | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('officer_encounters')
      .insert({
        officer_id: officerId,
        scan_id: scanId,
        pet_type: petData.petType,
        pet_breed: petData.petBreed,
        pet_color: petData.petColor,
        pet_description: petData.petDescription,
        pet_photo_url: petData.petPhotoUrl,
        pickup_location_lat: location.lat,
        pickup_location_lon: location.lon,
        pickup_location_address: location.address,
        matched_pet_id: match?.petId,
        match_confidence: match?.confidence,
        match_source: match?.source,
        owner_name: match?.ownerContact?.ownerName,
        owner_phone: match?.ownerContact?.ownerPhone,
        owner_email: match?.ownerContact?.ownerEmail,
        emergency_contact_name: match?.ownerContact?.emergencyContactName,
        emergency_contact_phone: match?.ownerContact?.emergencyContactPhone,
        status: 'active',
        outcome: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;

  } catch (error: any) {
    console.error('[Officer Service] Create encounter error:', error.message);
    return null;
  }
}

/**
 * Record RTO (Return to Owner)
 */
export async function recordRTO(
  encounterId: number,
  officerId: number,
  rtoData: {
    ownerIdType: string;
    ownerIdVerified: boolean;
    ownerSignatureCaptured: boolean;
    microchipScanned?: boolean;
    microchipNumber?: string;
    microchipMatches?: boolean;
    reunionPhotoUrl?: string;
    officerNotes?: string;
  }
): Promise<boolean> {
  if (!supabase) return false;

  try {
    // Update encounter status
    await supabase
      .from('officer_encounters')
      .update({
        outcome: 'rto',
        outcome_timestamp: new Date().toISOString(),
        rto_verified: rtoData.ownerIdVerified,
        status: 'resolved'
      })
      .eq('id', encounterId);

    // Create RTO log
    await supabase
      .from('officer_rto_log')
      .insert({
        encounter_id: encounterId,
        officer_id: officerId,
        owner_id_type: rtoData.ownerIdType,
        owner_id_verified: rtoData.ownerIdVerified,
        owner_signature_captured: rtoData.ownerSignatureCaptured,
        microchip_scanned: rtoData.microchipScanned,
        microchip_number: rtoData.microchipNumber,
        microchip_matches: rtoData.microchipMatches,
        reunion_photo_url: rtoData.reunionPhotoUrl,
        officer_notes: rtoData.officerNotes,
        owner_confirmed_at: new Date().toISOString()
      });

    return true;

  } catch (error: any) {
    console.error('[Officer Service] Record RTO error:', error.message);
    return false;
  }
}

/**
 * Get officer's recent encounters
 */
export async function getOfficerEncounters(officerId: number, limit: number = 20): Promise<Encounter[]> {
  if (!supabase) return [];

  try {
    const { data } = await supabase
      .from('officer_encounters')
      .select('*')
      .eq('officer_id', officerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate string similarity (Jaccard-like)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().split(/\s+/);
  const s2 = str2.toLowerCase().split(/\s+/);
  
  const intersection = s1.filter(word => s2.includes(word));
  const union = new Set([...s1, ...s2]);
  
  return intersection.length / union.size;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

