import { NextRequest, NextResponse } from 'next/server';
import { registerOfficer, isValidOfficerEmail } from '../../../../../lib/officer-service';

/**
 * POST /api/petreunion/officer/register
 * Register a new field officer (Animal Control / Law Enforcement)
 * Requires a professional email domain (.gov, .org, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.departmentName || !body.departmentType || !body.workEmail) {
      return NextResponse.json(
        { error: 'userId, departmentName, departmentType, and workEmail are required' },
        { status: 400 }
      );
    }

    // Pre-validate email domain
    if (!isValidOfficerEmail(body.workEmail)) {
      return NextResponse.json(
        { 
          error: 'Invalid professional email', 
          details: 'Officers must register with a .gov, .org, or other official agency email address.',
          validDomains: ['.gov', '.org', 'police.*', 'sheriff.*', 'animalcontrol.*', 'county.*', 'municipal.*']
        },
        { status: 400 }
      );
    }

    // Validate department type
    const validTypes = ['animal_control', 'police', 'sheriff', 'municipal', 'state', 'federal', 'other'];
    if (!validTypes.includes(body.departmentType)) {
      return NextResponse.json(
        { error: `departmentType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await registerOfficer({
      userId: body.userId,
      badgeNumber: body.badgeNumber,
      departmentName: body.departmentName,
      departmentType: body.departmentType,
      jurisdiction: body.jurisdiction,
      workEmail: body.workEmail,
      workPhone: body.workPhone,
      verificationDocumentUrl: body.verificationDocumentUrl
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration submitted. Your account is pending verification.',
      officer: {
        id: result.officer?.id,
        departmentName: result.officer?.department_name,
        isVerified: result.officer?.is_verified
      }
    });

  } catch (error: any) {
    console.error('[Officer Register] Error:', error);
    return NextResponse.json(
      { error: 'Registration failed', details: error.message },
      { status: 500 }
    );
  }
}

