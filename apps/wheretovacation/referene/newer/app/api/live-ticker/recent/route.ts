import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // 'catch' | 'booking' | 'review' | 'all'
    const hours = parseInt(searchParams.get('hours') || '6');

    // Calculate time threshold
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    let activities = [];

    // Get recent catches from completed charters
    if (type === 'all' || type === 'catch') {
      const { data: catches, error: catchError } = await supabase
        .from('charters')
        .select(`
          id,
          captain_id,
          status,
          completed_at,
          catch_data,
          location_data,
          captain:captains(id, name, avatar, trust_level, business_name)
        `)
        .eq('status', 'completed')
        .gte('completed_at', timeThreshold)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (!catchError && catches) {
        catches.forEach(charter => {
          if (charter.catch_data && charter.catch_data.species) {
            activities.push({
              id: `catch-${charter.id}`,
              type: 'catch',
              userId: charter.captain_id,
              userName: charter.captain?.name || 'Captain',
              userAvatar: charter.captain?.avatar || '',
              userTrustLevel: charter.captain?.trust_level || 'new',
              action: `Captain ${charter.captain?.name} landed a ${charter.catch_data.weight || ''}lb ${charter.catch_data.species}!`,
              details: charter.catch_data.technique || 'Great catch!',
              location: charter.location_data?.name || 'Gulf Coast',
              timestamp: charter.completed_at,
              metadata: {
                charterId: charter.id,
                species: charter.catch_data.species,
                weight: charter.catch_data.weight,
                photos: charter.catch_data.photos || [],
                bait: charter.catch_data.bait,
                weather: charter.catch_data.weather
              }
            });
          }
        });
      }
    }

    // Get recent bookings
    if (type === 'all' || type === 'booking') {
      const { data: bookings, error: bookingError } = await supabase
        .from('charters')
        .select(`
          id,
          client_id,
          created_at,
          charter_date,
          captain:captains(id, name, business_name),
          client:profiles(id, full_name, avatar)
        `)
        .gte('created_at', timeThreshold)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!bookingError && bookings) {
        bookings.forEach(booking => {
          activities.push({
            id: `booking-${booking.id}`,
            type: 'booking',
            userId: booking.client_id,
            userName: booking.client?.full_name || 'Guest',
            userAvatar: booking.client?.avatar || '',
            userTrustLevel: 'new',
            action: `${booking.client?.full_name || 'Someone'} booked a trip!`,
            details: `Fishing with ${booking.captain?.business_name || 'Captain'} on ${new Date(booking.charter_date).toLocaleDateString()}`,
            location: 'Gulf Coast',
            timestamp: booking.created_at,
            metadata: {
              charterId: booking.id,
              captainName: booking.captain?.business_name,
              charterDate: booking.charter_date
            }
          });
        });
      }
    }

    // Get recent reviews
    if (type === 'all' || type === 'review') {
      const { data: reviews, error: reviewError } = await supabase
        .from('charter_reviews')
        .select(`
          id,
          charter_id,
          user_id,
          rating,
          comment,
          created_at,
          charter:charters(id, captain_id),
          captain:captains(id, name, business_name),
          user:profiles(id, full_name, avatar)
        `)
        .gte('created_at', timeThreshold)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!reviewError && reviews) {
        reviews.forEach(review => {
          if (review.rating >= 4) { // Only show 4+ star reviews
            activities.push({
              id: `review-${review.id}`,
              type: 'review',
              userId: review.user_id,
              userName: review.user?.full_name || 'Guest',
              userAvatar: review.user?.avatar || '',
              userTrustLevel: 'new',
              action: `${review.user?.full_name || 'Someone'} left a ${review.rating}-star review!`,
              details: review.comment || 'Great experience!',
              location: review.captain?.business_name || 'Gulf Coast',
              timestamp: review.created_at,
              metadata: {
                charterId: review.charter_id,
                rating: review.rating,
                captainName: review.captain?.business_name
              }
            });
          }
        });
      }
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    activities = activities.slice(0, limit);

    return NextResponse.json(activities);

  } catch (error) {
    console.error('Error fetching live ticker data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live ticker data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    // Validate the request body
    const { type, userId, action, details, location, metadata } = body;

    if (!type || !userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert new activity
    const { data, error } = await supabase
      .from('live_activities')
      .insert({
        type,
        user_id: userId,
        action,
        details,
        location,
        metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting live activity:', error);
      return NextResponse.json(
        { error: 'Failed to create activity' },
        { status: 500 }
      );
    }

    // Trigger real-time update if WebSocket is available
    // This would typically be handled by a separate service
    try {
      await fetch(`${process.env.WEBSOCKET_SERVICE_URL}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'activity',
          data: {
            id: data.id,
            type: data.type,
            userId: data.user_id,
            userName: metadata?.userName || 'User',
            userAvatar: metadata?.userAvatar || '',
            userTrustLevel: metadata?.userTrustLevel || 'new',
            action: data.action,
            details: data.details,
            location: data.location,
            timestamp: data.created_at,
            metadata
          }
        })
      });
    } catch (wsError) {
      console.log('WebSocket broadcast failed, activity saved locally');
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error creating live activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
