/**
 * Weather Alert Monitor & SMS Blast
 * 
 * Automated weather monitoring that:
 * - Checks NOAA/NWS alerts every 15 minutes
 * - Identifies affected customers with active bookings
 * - Sends SMS alerts to customers and captains
 * - Tracks sent alerts to prevent duplicates
 * 
 * Can be triggered manually or via cron job
 * 
 * This is the automation-ready function for Zapier/zenflow integration
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherAlert {
  id: string;
  severity: string;
  event: string;
  description: string;
  expires: string;
  area: string;
}

interface Booking {
  id: string;
  user_id: string;
  captain_id?: string;
  booking_date: string;
  status: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Fetch active weather alerts from NWS for a location
 */
async function fetchWeatherAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
      headers: {
        Accept: 'application/geo+json',
        'User-Agent': 'gulfcoastcharters (weather-alert-monitor; contact: support@gulfcoastcharters.com)',
      },
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => null);
    const features: any[] = Array.isArray(data?.features) ? data.features : [];

    return features.slice(0, 10).map((f) => {
      const p = f?.properties || {};
      return {
        id: String(p?.id || f?.id || ''),
        severity: String(p?.severity || 'Minor'),
        event: String(p?.event || ''),
        description: String(p?.headline || p?.description || '').slice(0, 500),
        expires: String(p?.expires || p?.ends || ''),
        area: String(p?.areaDesc || ''),
      };
    });
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    return [];
  }
}

/**
 * Get active bookings for a location
 */
async function getActiveBookings(
  supabase: any,
  lat: number,
  lon: number,
  alertDate: string
): Promise<Booking[]> {
  try {
    // Get confirmed bookings that overlap with alert timeframe
    const now = new Date();
    const alertExpires = new Date(alertDate);
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id, user_id, captain_id, booking_date, status, location, latitude, longitude')
      .eq('status', 'confirmed')
      .gte('booking_date', now.toISOString())
      .lte('booking_date', alertExpires.toISOString());

    if (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }

    // Filter by distance (50 miles radius)
    return (data || []).filter((b: Booking) => {
      if (b.latitude && b.longitude) {
        const distance = calculateDistance(lat, lon, b.latitude, b.longitude);
        return distance <= 50; // 50 miles
      }
      // If no coordinates, include it (manual review needed)
      return true;
    });
  } catch (error) {
    console.error('Error getting active bookings:', error);
    return [];
  }
}

/**
 * Send SMS via Twilio/Sinch
 */
async function sendSMSAlert(
  supabase: any,
  userId: string,
  phoneNumber: string,
  message: string,
  alertId: string,
  bookingId?: string,
  captainId?: string
): Promise<boolean> {
  try {
    // Check if already sent (prevent duplicates)
    const alreadySent = await wasAlertAlreadySent(supabase, alertId, phoneNumber, bookingId);
    if (alreadySent) {
      console.log(`Alert ${alertId} already sent to ${phoneNumber}, skipping`);
      return false;
    }

    // Use existing twilio-sms-service edge function
    const { data, error } = await supabase.functions.invoke('twilio-sms-service', {
      body: {
        action: 'send_sms',
        userId: userId,
        phoneNumber: phoneNumber,
        message: message,
        notificationType: 'urgent_message', // Weather alerts are urgent
      },
    });

    if (error || !data?.success) {
      console.error('Error sending SMS:', error || data);
      
      // Log failed attempt
      await supabase.from('weather_alert_logs').insert({
        alert_id: alertId,
        phone_number: phoneNumber,
        message,
        sent_at: new Date().toISOString(),
        status: 'failed',
        user_id: userId,
        captain_id: captainId,
        booking_id: bookingId,
      }).catch(() => {});
      
      return false;
    }

    // Log successful alert
    await supabase.from('weather_alert_logs').insert({
      alert_id: alertId,
      phone_number: phoneNumber,
      message,
      sent_at: new Date().toISOString(),
      status: 'sent',
      user_id: userId,
      captain_id: captainId,
      booking_id: bookingId,
    }).catch(() => {}); // Don't fail if logging fails

    return true;
  } catch (error) {
    console.error('Error in sendSMSAlert:', error);
    return false;
  }
}

/**
 * Get user phone number from profile (with SMS opt-in check)
 * Checks both profiles.sms_opt_in and notification_preferences
 */
async function getUserPhone(supabase: any, userId: string): Promise<{ phone: string; optIn: boolean } | null> {
  try {
    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, sms_opt_in, phone_verified')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.phone_number || !profile.phone_verified) return null;

    // Check notification preferences (more granular control)
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('sms_notifications, sms_urgent_message')
      .eq('user_id', userId)
      .maybeSingle();

    // User must have SMS opt-in enabled AND either:
    // 1. No notification_preferences record (default allow), OR
    // 2. sms_notifications enabled, OR
    // 3. sms_urgent_message enabled (weather alerts are urgent)
    const hasOptIn = profile.sms_opt_in === true;
    const hasSmsEnabled = prefs?.sms_notifications !== false; // Default true if no record
    const hasUrgentEnabled = prefs?.sms_urgent_message !== false; // Default true if no record

    const optIn = hasOptIn && (hasSmsEnabled || hasUrgentEnabled);
    
    return {
      phone: profile.phone_number,
      optIn: optIn,
    };
  } catch {
    return null;
  }
}

/**
 * Get captain phone number
 */
async function getCaptainPhone(supabase: any, captainId: string): Promise<string | null> {
  try {
    // Try captain_profiles first, fallback to profiles via user_id
    const { data: captainData } = await supabase
      .from('captain_profiles')
      .select('user_id, phone_number')
      .eq('id', captainId)
      .maybeSingle();

    if (captainData?.phone_number) {
      return captainData.phone_number;
    }

    // Fallback to user profile
    if (captainData?.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone_number, phone_verified')
        .eq('id', captainData.user_id)
        .maybeSingle();

      if (profileData?.phone_number && profileData.phone_verified) {
        return profileData.phone_number;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if alert was already sent (prevent duplicates)
 */
async function wasAlertAlreadySent(
  supabase: any,
  alertId: string,
  phoneNumber: string,
  bookingId?: string
): Promise<boolean> {
  try {
    const query = supabase
      .from('weather_alert_logs')
      .select('id')
      .eq('alert_id', alertId)
      .eq('phone_number', phoneNumber)
      .eq('status', 'sent')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Within last 24 hours

    if (bookingId) {
      query.eq('booking_id', bookingId);
    }

    const { data } = await query.limit(1);
    return (data?.length || 0) > 0;
  } catch {
    return false; // If check fails, allow sending (fail open)
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'monitor';

    // Default monitoring locations (Gulf Coast area)
    const monitoringLocations = [
      { name: 'Gulf Shores', lat: 30.2460, lon: -87.7008 },
      { name: 'Orange Beach', lat: 30.2944, lon: -87.5736 },
      { name: 'Pensacola', lat: 30.4213, lon: -87.2169 },
      { name: 'Dauphin Island', lat: 30.2500, lon: -88.1097 },
    ];

    const stats = {
      alerts_found: 0,
      customers_notified: 0,
      captains_notified: 0,
      errors: [] as string[],
    };

    // Check each monitoring location
    for (const location of monitoringLocations) {
      const alerts = await fetchWeatherAlerts(location.lat, location.lon);

      // Filter for severe/extreme alerts only
      const severeAlerts = alerts.filter(
        (a) =>
          a.severity.toLowerCase().includes('severe') ||
          a.severity.toLowerCase().includes('extreme') ||
          a.event.toLowerCase().includes('warning')
      );

      if (severeAlerts.length === 0) continue;

      stats.alerts_found += severeAlerts.length;

      for (const alert of severeAlerts) {
        // Get active bookings for this location
        const bookings = await getActiveBookings(
          supabase,
          location.lat,
          location.lon,
          alert.expires
        );

        // Notify customers
        for (const booking of bookings) {
          if (booking.user_id) {
            const phoneData = await getUserPhone(supabase, booking.user_id);
            if (phoneData && phoneData.optIn) {
              const message = `⚠️ WEATHER ALERT: ${alert.event} in ${location.name}. Your booking on ${new Date(booking.booking_date).toLocaleDateString()} may be affected. ${alert.description.slice(0, 100)}... Check your booking for updates.`;
              
              const sent = await sendSMSAlert(
                supabase,
                booking.user_id,
                phoneData.phone,
                message,
                alert.id,
                booking.id
              );
              if (sent) stats.customers_notified++;
            }
          }

          // Notify captain
          if (booking.captain_id) {
            const captainPhone = await getCaptainPhone(supabase, booking.captain_id);
            if (captainPhone) {
              // Get captain's user_id for logging
              const { data: captainData } = await supabase
                .from('captain_profiles')
                .select('user_id')
                .eq('id', booking.captain_id)
                .maybeSingle();
              
              const message = `⚠️ WEATHER ALERT: ${alert.event} in ${location.name}. You have a booking on ${new Date(booking.booking_date).toLocaleDateString()}. ${alert.description.slice(0, 100)}...`;
              
              const sent = await sendSMSAlert(
                supabase,
                captainData?.user_id || booking.captain_id,
                captainPhone,
                message,
                alert.id,
                booking.id,
                booking.captain_id
              );
              if (sent) stats.captains_notified++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Processed ${stats.alerts_found} alerts, notified ${stats.customers_notified} customers and ${stats.captains_notified} captains`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Weather alert monitor error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
