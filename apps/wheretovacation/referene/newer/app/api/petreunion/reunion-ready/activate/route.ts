import { NextRequest, NextResponse } from 'next/server';
import { 
  activateInstantAlert, 
  deactivateAlert,
  isSubscriptionActive 
} from '../../../../../lib/reunion-ready-service';

/**
 * POST /api/petreunion/reunion-ready/activate
 * 
 * INSTANT ALERT: Activate lost pet status with one click
 * 
 * This triggers the FULL lost pet workflow:
 * 1. Creates lost_pets record with all vault data
 * 2. Generates QR poster
 * 3. Notifies nearby camera watch volunteers
 * 4. Starts AI scrubbing of camera uploads
 * 
 * Body: {
 *   vaultPetId: number
 * }
 * 
 * REQUIRES: Active ReunionReady subscription
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultPetId } = body;

    if (!vaultPetId) {
      return NextResponse.json(
        { error: 'vaultPetId is required' },
        { status: 400 }
      );
    }

    console.log(`[Instant Alert] 🚨 Activation requested for vault pet ${vaultPetId}`);

    const result = await activateInstantAlert(vaultPetId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      lostPetId: result.lostPetId,
      message: result.message,
      actions: result.actions,
      nextSteps: [
        'Share your pet\'s page on social media',
        'Print QR posters and post in your neighborhood',
        'Check your Live Search Map for sightings',
        'Ask neighbors to upload camera footage'
      ],
      urgentTip: '🕐 The first 24 hours are critical! The more people who see the alert, the better the chances of finding your pet.'
    });

  } catch (error: any) {
    console.error('[Instant Alert] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Activation failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/petreunion/reunion-ready/activate
 * 
 * Deactivate alert (pet found or false alarm)
 * 
 * Body: {
 *   vaultPetId: number,
 *   resolution: 'found_safe' | 'found_injured' | 'not_found' | 'false_alarm',
 *   notes?: string
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultPetId, resolution, notes } = body;

    if (!vaultPetId || !resolution) {
      return NextResponse.json(
        { error: 'vaultPetId and resolution are required' },
        { status: 400 }
      );
    }

    const validResolutions = ['found_safe', 'found_injured', 'not_found', 'false_alarm'];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json(
        { error: 'resolution must be one of: ' + validResolutions.join(', ') },
        { status: 400 }
      );
    }

    const success = await deactivateAlert(vaultPetId, resolution, notes);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to deactivate alert' },
        { status: 500 }
      );
    }

    const messages: Record<string, string> = {
      found_safe: '🎉 Wonderful news! We\'re so glad your pet is home safe!',
      found_injured: '💙 We hope your pet makes a full recovery. Alert deactivated.',
      not_found: '💔 We\'re sorry. The alert has been closed but your pet\'s info remains in the vault.',
      false_alarm: '✓ Alert cancelled. Your ReunionReady protection remains active.'
    };

    return NextResponse.json({
      success: true,
      message: messages[resolution],
      resolution
    });

  } catch (error: any) {
    console.error('[Instant Alert] Deactivate error:', error);
    return NextResponse.json(
      { error: error.message || 'Deactivation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/petreunion/reunion-ready/activate?vaultPetId=123
 * 
 * Check if activation is available (subscription valid)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultPetId = searchParams.get('vaultPetId');

    if (!vaultPetId) {
      return NextResponse.json(
        { error: 'vaultPetId is required' },
        { status: 400 }
      );
    }

    const canActivate = await isSubscriptionActive(parseInt(vaultPetId));

    return NextResponse.json({
      vaultPetId: parseInt(vaultPetId),
      canActivate,
      message: canActivate 
        ? '✅ Instant Alert is ready. One click to activate.' 
        : '⚠️ ReunionReady subscription required to use Instant Alert.'
    });

  } catch (error: any) {
    console.error('[Instant Alert] Check error:', error);
    return NextResponse.json(
      { error: error.message || 'Check failed' },
      { status: 500 }
    );
  }
}

