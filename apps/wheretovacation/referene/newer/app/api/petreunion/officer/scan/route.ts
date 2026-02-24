import { NextRequest, NextResponse } from 'next/server';
import { 
  performDeepScan, 
  createEncounter,
  getOfficerByUserId 
} from '../../../../../lib/officer-service';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/petreunion/officer/scan
 * 
 * Deep Scan - The core field officer feature
 * 
 * Takes a photo of a found pet and instantly:
 * 1. Analyzes the pet using AI (breed, color, size, markings)
 * 2. Searches lost_pets and pet_vault databases
 * 3. If match >= 85%, reveals owner emergency contact
 * 4. Creates an encounter record
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract fields
    const userId = formData.get('userId') as string;
    const photo = formData.get('photo') as File;
    const latitude = parseFloat(formData.get('latitude') as string);
    const longitude = parseFloat(formData.get('longitude') as string);
    const address = formData.get('address') as string | null;

    // Validate required fields
    if (!userId || !photo) {
      return NextResponse.json(
        { error: 'userId and photo are required' },
        { status: 400 }
      );
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid GPS coordinates (latitude, longitude) are required' },
        { status: 400 }
      );
    }

    // Get and verify officer
    const officer = await getOfficerByUserId(userId);
    if (!officer) {
      return NextResponse.json(
        { error: 'Officer not found. Please register first.' },
        { status: 403 }
      );
    }

    if (!officer.is_verified) {
      return NextResponse.json(
        { error: 'Officer account pending verification. Please wait for admin approval.' },
        { status: 403 }
      );
    }

    // Convert photo to buffer
    const photoBuffer = Buffer.from(await photo.arrayBuffer());

    // Upload photo to Supabase Storage
    let photoUrl = '';
    if (supabase) {
      const fileName = `officer-scans/${officer.id}/${Date.now()}-${photo.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('petreunion')
        .upload(fileName, photoBuffer, {
          contentType: photo.type || 'image/jpeg'
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('petreunion')
          .getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }
    }

    // Perform deep scan
    const scanResult = await performDeepScan(
      officer.id,
      photoBuffer,
      photoUrl,
      { lat: latitude, lon: longitude, address: address || undefined }
    );

    if (!scanResult.success) {
      return NextResponse.json(
        { error: 'Scan failed. Please try again.' },
        { status: 500 }
      );
    }

    // Create encounter if matches found
    let encounterId: number | undefined;
    if (scanResult.topMatch) {
      const encounter = await createEncounter(
        officer.id,
        scanResult.scanId,
        {
          petType: scanResult.topMatch.petType,
          petBreed: scanResult.topMatch.breed,
          petColor: scanResult.topMatch.color,
          petPhotoUrl: photoUrl
        },
        { lat: latitude, lon: longitude, address: address || undefined },
        scanResult.hasHighConfidenceMatch ? {
          petId: scanResult.topMatch.petId,
          confidence: scanResult.topMatch.confidence,
          source: scanResult.topMatch.source,
          ownerContact: scanResult.ownerContact
        } : undefined
      );
      encounterId = encounter?.id;
    }

    // Build response
    const response: any = {
      success: true,
      scanId: scanResult.scanId,
      processingTimeMs: scanResult.processingTimeMs,
      matchesFound: scanResult.matches.length,
      encounterId
    };

    // Always include matches summary
    response.matches = scanResult.matches.map(match => ({
      petId: match.petId,
      petName: match.petName,
      petType: match.petType,
      breed: match.breed,
      color: match.color,
      confidence: match.confidence,
      lastSeenLocation: match.lastSeenLocation,
      daysLost: match.daysLost,
      photoUrl: match.photoUrl
    }));

    // HIGH CONFIDENCE MATCH (>= 85%) - Reveal owner contact
    if (scanResult.hasHighConfidenceMatch && scanResult.ownerContact) {
      response.highConfidenceMatch = true;
      response.ownerContact = {
        ownerName: scanResult.ownerContact.ownerName,
        ownerPhone: scanResult.ownerContact.ownerPhone,
        ownerEmail: scanResult.ownerContact.ownerEmail,
        emergencyContactName: scanResult.ownerContact.emergencyContactName,
        emergencyContactPhone: scanResult.ownerContact.emergencyContactPhone,
        homeAddress: scanResult.ownerContact.homeAddress,
        petMedicalNotes: scanResult.ownerContact.petMedicalNotes,
        approachInstructions: scanResult.ownerContact.approachInstructions
      };
      response.message = `HIGH CONFIDENCE MATCH (${scanResult.topMatch?.confidence}%). Owner contact information revealed for potential Return to Owner (RTO).`;
    } else if (scanResult.topMatch) {
      response.highConfidenceMatch = false;
      response.message = `Best match: ${scanResult.topMatch.confidence}% confidence. Below 85% threshold for immediate RTO. Consider transport to shelter.`;
    } else {
      response.highConfidenceMatch = false;
      response.message = 'No matches found in the database.';
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Officer Scan] Error:', error);
    return NextResponse.json(
      { error: 'Scan failed', details: error.message },
      { status: 500 }
    );
  }
}

