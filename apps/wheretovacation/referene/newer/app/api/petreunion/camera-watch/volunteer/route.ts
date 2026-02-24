import { NextRequest, NextResponse } from 'next/server';
import { registerVolunteer, getVolunteerNotifications } from '../../../../../lib/camera-watch-service';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/petreunion/camera-watch/volunteer
 * 
 * Register as a camera watch volunteer.
 * 
 * Body: {
 *   lat: number,
 *   lon: number,
 *   address?: string,
 *   city?: string,
 *   state?: string,
 *   zip?: string,
 *   email?: string,
 *   phone?: string,
 *   maxRadiusMiles?: number (default: 1.0),
 *   anonymousByDefault?: boolean (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { lat, lon, address, city, state, zip, email, phone, maxRadiusMiles, anonymousByDefault } = body;

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Location (lat, lon) is required' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    const volunteer = await registerVolunteer({
      lat,
      lon,
      address,
      city,
      state,
      zip,
      email,
      phone,
      maxRadiusMiles: maxRadiusMiles || 1.0,
      anonymousByDefault: anonymousByDefault ?? true
    });

    if (!volunteer) {
      return NextResponse.json(
        { error: 'Failed to register volunteer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      volunteerId: volunteer.id,
      message: `Thank you for joining the Neighborhood Camera Watch! You'll be notified when a pet goes missing within ${volunteer.max_radius_miles} miles of your location.`,
      settings: {
        maxRadiusMiles: volunteer.max_radius_miles,
        anonymousByDefault: volunteer.anonymous_by_default,
        notifyPush: volunteer.notify_push
      }
    });

  } catch (error: any) {
    console.error('[Camera Watch Volunteer] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/petreunion/camera-watch/volunteer?id=123
 * 
 * Get volunteer notifications
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volunteerId = searchParams.get('id');
    const unreadOnly = searchParams.get('unread') !== 'false';

    if (!volunteerId) {
      return NextResponse.json(
        { error: 'Volunteer ID is required' },
        { status: 400 }
      );
    }

    const notifications = await getVolunteerNotifications(
      Number(volunteerId),
      unreadOnly
    );

    return NextResponse.json({
      volunteerId,
      notifications,
      count: notifications.length,
      unreadOnly
    });

  } catch (error: any) {
    console.error('[Camera Watch Volunteer] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/petreunion/camera-watch/volunteer?id=123
 * 
 * Update volunteer settings or mark notification read
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volunteerId = searchParams.get('id');
    const notificationId = searchParams.get('notificationId');

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Mark notification as read
    if (notificationId) {
      const { error } = await supabase
        .from('camera_watch_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update notification' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, notificationId, action: 'marked_read' });
    }

    // Update volunteer settings
    if (volunteerId) {
      const body = await request.json();
      
      const { error } = await supabase
        .from('camera_watch_volunteers')
        .update({
          max_radius_miles: body.maxRadiusMiles,
          anonymous_by_default: body.anonymousByDefault,
          notify_push: body.notifyPush,
          is_active: body.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', volunteerId);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update volunteer' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, volunteerId, action: 'settings_updated' });
    }

    return NextResponse.json(
      { error: 'No valid operation specified' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[Camera Watch Volunteer] PATCH Error:', error);
    return NextResponse.json(
      { error: error.message || 'Update failed' },
      { status: 500 }
    );
  }
}

