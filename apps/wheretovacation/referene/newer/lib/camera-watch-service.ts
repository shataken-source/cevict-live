/**
 * NEIGHBORHOOD CAMERA WATCH SERVICE
 * 
 * Privacy-first notification system that alerts nearby volunteers
 * when a pet goes missing, allowing them to check their cameras.
 * 
 * Features:
 * - 1-mile radius geospatial search
 * - Dashboard notifications (no spam emails)
 * - Anonymous uploads by default
 * - AI-powered video/image analysis
 */

import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export interface Volunteer {
  id: number;
  location_lat: number;
  location_lon: number;
  location_city: string;
  location_state: string;
  notify_email?: string;
  notify_phone?: string;
  notify_push: boolean;
  max_radius_miles: number;
  anonymous_by_default: boolean;
}

export interface LostPetAlert {
  petId: number;
  petName: string;
  petType: string;
  breed: string;
  color: string;
  photoUrl?: string;
  lastSeenLat: number;
  lastSeenLon: number;
  lastSeenLocation: string;
  dateLost: string;
}

export interface CameraUpload {
  id: number;
  petId: number;
  storageUrl: string;
  thumbnailUrl?: string;
  captureLocation?: { lat: number; lon: number };
  captureTimestamp?: Date;
  aiMatchConfidence?: number;
  isVerifiedMatch: boolean;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find all volunteers within radius of a location
 */
export async function findVolunteersInRadius(
  lat: number,
  lon: number,
  radiusMiles: number = 1.0
): Promise<{ volunteer: Volunteer; distance: number }[]> {
  if (!supabase) {
    console.error('[CameraWatch] Supabase not configured');
    return [];
  }

  try {
    // Get all active volunteers (we'll filter by distance in JS for more flexibility)
    const { data: volunteers, error } = await supabase
      .from('camera_watch_volunteers')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    if (!volunteers) return [];

    // Filter by distance and respect each volunteer's max radius
    const results: { volunteer: Volunteer; distance: number }[] = [];

    for (const v of volunteers) {
      const distance = calculateDistanceMiles(lat, lon, v.location_lat, v.location_lon);
      const effectiveRadius = Math.min(radiusMiles, v.max_radius_miles);
      
      if (distance <= effectiveRadius) {
        results.push({ volunteer: v, distance });
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  } catch (error: any) {
    console.error('[CameraWatch] Error finding volunteers:', error.message);
    return [];
  }
}

/**
 * Send "Check Your Cameras" notification to volunteers near a lost pet
 */
export async function notifyNearbyVolunteers(
  petAlert: LostPetAlert
): Promise<{ notified: number; volunteers: Volunteer[] }> {
  if (!supabase) {
    console.error('[CameraWatch] Supabase not configured');
    return { notified: 0, volunteers: [] };
  }

  console.log(`[CameraWatch] Finding volunteers near ${petAlert.lastSeenLocation}...`);

  // Find volunteers within 1 mile
  const nearbyVolunteers = await findVolunteersInRadius(
    petAlert.lastSeenLat,
    petAlert.lastSeenLon,
    1.0 // 1 mile radius
  );

  if (nearbyVolunteers.length === 0) {
    console.log('[CameraWatch] No volunteers found in area');
    return { notified: 0, volunteers: [] };
  }

  console.log(`[CameraWatch] Found ${nearbyVolunteers.length} volunteers to notify`);

  const notifiedVolunteers: Volunteer[] = [];
  let notifiedCount = 0;

  for (const { volunteer, distance } of nearbyVolunteers) {
    try {
      // Create dashboard notification (privacy-first: no email by default)
      const { error: notifError } = await supabase
        .from('camera_watch_notifications')
        .insert({
          volunteer_id: volunteer.id,
          pet_id: petAlert.petId,
          notification_type: 'new_lost_pet',
          message: `🔍 A ${petAlert.color} ${petAlert.breed} named "${petAlert.petName}" went missing ${distance.toFixed(2)} miles from you. Please check your cameras!`,
          distance_miles: distance
        });

      if (notifError) {
        // Handle duplicate notifications gracefully
        if (notifError.code !== '23505') { // Not a unique violation
          console.error(`[CameraWatch] Failed to notify volunteer ${volunteer.id}:`, notifError);
          continue;
        }
      }

      notifiedCount++;
      notifiedVolunteers.push(volunteer);

      console.log(`[CameraWatch] Notified volunteer ${volunteer.id} (${distance.toFixed(2)} mi away)`);

    } catch (error: any) {
      console.error(`[CameraWatch] Error notifying volunteer ${volunteer.id}:`, error.message);
    }
  }

  return { notified: notifiedCount, volunteers: notifiedVolunteers };
}

/**
 * Register a new camera watch volunteer
 */
export async function registerVolunteer(data: {
  userId?: string;
  lat: number;
  lon: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
  maxRadiusMiles?: number;
  anonymousByDefault?: boolean;
}): Promise<Volunteer | null> {
  if (!supabase) return null;

  try {
    const { data: volunteer, error } = await supabase
      .from('camera_watch_volunteers')
      .insert({
        user_id: data.userId,
        location_lat: data.lat,
        location_lon: data.lon,
        location_address: data.address,
        location_city: data.city,
        location_state: data.state,
        location_zip: data.zip,
        notify_email: data.email,
        notify_phone: data.phone,
        max_radius_miles: data.maxRadiusMiles || 1.0,
        anonymous_by_default: data.anonymousByDefault ?? true,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return volunteer;
  } catch (error: any) {
    console.error('[CameraWatch] Error registering volunteer:', error.message);
    return null;
  }
}

/**
 * Get pending notifications for a volunteer
 */
export async function getVolunteerNotifications(
  volunteerId: number,
  unreadOnly: boolean = true
): Promise<any[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from('camera_watch_notifications')
      .select(`
        *,
        lost_pets:pet_id (
          id, pet_name, pet_type, breed, color, photo_url,
          location_city, location_state, status
        )
      `)
      .eq('volunteer_id', volunteerId)
      .order('sent_at', { ascending: false });

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('[CameraWatch] Error getting notifications:', error.message);
    return [];
  }
}

/**
 * Record a camera upload from a volunteer
 */
export async function recordCameraUpload(data: {
  volunteerId?: number;
  petId: number;
  uploadType: 'image' | 'video';
  storageUrl: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  captureTimestamp?: Date;
  captureLocationLat?: number;
  captureLocationLon?: number;
  captureLocationText?: string;
  anonymous?: boolean;
  consentToContact?: boolean;
  contactEmail?: string;
  contactPhone?: string;
}): Promise<CameraUpload | null> {
  if (!supabase) return null;

  try {
    const { data: upload, error } = await supabase
      .from('camera_uploads')
      .insert({
        volunteer_id: data.volunteerId,
        pet_id: data.petId,
        upload_type: data.uploadType,
        storage_url: data.storageUrl,
        thumbnail_url: data.thumbnailUrl,
        file_size_bytes: data.fileSizeBytes,
        duration_seconds: data.durationSeconds,
        capture_timestamp: data.captureTimestamp?.toISOString(),
        capture_location_lat: data.captureLocationLat,
        capture_location_lon: data.captureLocationLon,
        capture_location_text: data.captureLocationText,
        uploader_anonymous: data.anonymous ?? true,
        uploader_consent_to_contact: data.consentToContact ?? false,
        uploader_contact_email: data.contactEmail,
        uploader_contact_phone: data.contactPhone,
        ai_analyzed: false
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: upload.id,
      petId: upload.pet_id,
      storageUrl: upload.storage_url,
      thumbnailUrl: upload.thumbnail_url,
      isVerifiedMatch: false
    };
  } catch (error: any) {
    console.error('[CameraWatch] Error recording upload:', error.message);
    return null;
  }
}

/**
 * Update AI analysis results for an upload
 */
export async function updateUploadAnalysis(
  uploadId: number,
  analysis: {
    matchConfidence: number;
    matchDetails: any;
    detectedPetType?: string;
    detectedFeatures?: any;
  }
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('camera_uploads')
      .update({
        ai_analyzed: true,
        ai_analysis_at: new Date().toISOString(),
        ai_match_confidence: analysis.matchConfidence,
        ai_match_details: analysis.matchDetails,
        ai_detected_pet_type: analysis.detectedPetType,
        ai_detected_features: analysis.detectedFeatures,
        // Auto-pin on map if confidence > 70%
        pinned_on_map: analysis.matchConfidence > 0.7
      })
      .eq('id', uploadId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('[CameraWatch] Error updating analysis:', error.message);
    return false;
  }
}

/**
 * Get all sightings/uploads for map display
 */
export async function getMapPins(petId: number): Promise<{
  id: number;
  lat: number;
  lon: number;
  timestamp: string;
  type: 'sighting' | 'camera';
  confidence?: number;
  thumbnailUrl?: string;
}[]> {
  if (!supabase) return [];

  try {
    // Get camera uploads with location
    const { data: uploads, error: uploadError } = await supabase
      .from('camera_uploads')
      .select('*')
      .eq('pet_id', petId)
      .eq('pinned_on_map', true)
      .not('capture_location_lat', 'is', null);

    if (uploadError) throw uploadError;

    // Get regular sightings
    const { data: sightings, error: sightingError } = await supabase
      .from('pet_sightings')
      .select('*')
      .eq('pet_id', petId)
      .not('sighting_lat', 'is', null);

    if (sightingError) throw sightingError;

    const pins: any[] = [];

    // Add camera uploads
    for (const upload of uploads || []) {
      pins.push({
        id: upload.id,
        lat: upload.capture_location_lat,
        lon: upload.capture_location_lon,
        timestamp: upload.capture_timestamp || upload.created_at,
        type: 'camera',
        confidence: upload.ai_match_confidence,
        thumbnailUrl: upload.thumbnail_url
      });
    }

    // Add regular sightings
    for (const sighting of sightings || []) {
      pins.push({
        id: sighting.id,
        lat: sighting.sighting_lat,
        lon: sighting.sighting_lon,
        timestamp: sighting.sighting_date,
        type: 'sighting',
        thumbnailUrl: sighting.photo_url
      });
    }

    // Sort by timestamp, most recent first
    return pins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  } catch (error: any) {
    console.error('[CameraWatch] Error getting map pins:', error.message);
    return [];
  }
}

