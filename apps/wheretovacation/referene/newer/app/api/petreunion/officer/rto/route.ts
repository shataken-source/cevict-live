import { NextRequest, NextResponse } from 'next/server';
import { 
  recordRTO,
  getOfficerByUserId 
} from '../../../../../lib/officer-service';

/**
 * POST /api/petreunion/officer/rto
 * 
 * Record a Return to Owner (RTO) event
 * This is the happy ending - pet returned to owner in the field
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.encounterId) {
      return NextResponse.json(
        { error: 'userId and encounterId are required' },
        { status: 400 }
      );
    }

    // Get and verify officer
    const officer = await getOfficerByUserId(body.userId);
    if (!officer) {
      return NextResponse.json(
        { error: 'Officer not found' },
        { status: 403 }
      );
    }

    if (!officer.is_verified) {
      return NextResponse.json(
        { error: 'Officer account not verified' },
        { status: 403 }
      );
    }

    // Record the RTO
    const success = await recordRTO(
      body.encounterId,
      officer.id,
      {
        ownerIdType: body.ownerIdType || 'drivers_license',
        ownerIdVerified: body.ownerIdVerified || false,
        ownerSignatureCaptured: body.ownerSignatureCaptured || false,
        microchipScanned: body.microchipScanned,
        microchipNumber: body.microchipNumber,
        microchipMatches: body.microchipMatches,
        reunionPhotoUrl: body.reunionPhotoUrl,
        officerNotes: body.officerNotes
      }
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record RTO' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Return to Owner recorded successfully. Great job reuniting this pet with their family!'
    });

  } catch (error: any) {
    console.error('[Officer RTO] Error:', error);
    return NextResponse.json(
      { error: 'RTO recording failed', details: error.message },
      { status: 500 }
    );
  }
}

