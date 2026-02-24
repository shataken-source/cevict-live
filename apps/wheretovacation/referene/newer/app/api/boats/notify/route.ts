import { NextResponse } from 'next/server';

/**
 * Receive notifications from GCC when boats are added/updated
 * This enables cross-platform communication
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boatId, boatName, action } = body;

    console.log(`📢 Received boat notification from GCC: ${action} - ${boatName} (${boatId})`);

    // In production, you might:
    // - Update local cache of available boats
    // - Notify users who have shown interest in similar boats
    // - Update recommendations
    // - Sync with vacation rental packages

    return NextResponse.json({
      success: true,
      message: 'Notification received',
      boatId,
      boatName,
      action,
    });
  } catch (error: any) {
    console.error('Error processing boat notification:', error);
    return NextResponse.json(
      { error: 'Failed to process notification', details: error.message },
      { status: 500 }
    );
  }
}

