/**
 * Weather Alerts System for Charter Booking Platform
 * Supabase Edge Function - Runs hourly via cron
 * Checks NOAA buoy data and sends email alerts for dangerous conditions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NOAA Buoy API configuration
const NOAA_BUOY_API = 'https://www.ndbc.noaa.gov/data/realtime2/'
const NOAA_STATIONS = {
  'orange_beach': '42012',
  'mobile_bay': '42040', 
  'pensacola': '42039',
  'dauphin_island': '42013',
  'mississippi_sound': '42007'
}

// Weather thresholds for alerts
const WEATHER_THRESHOLDS = {
  wind_speed_warning: 20, // knots
  wind_speed_danger: 28,  // knots
  wave_height_warning: 4, // feet
  wave_height_danger: 6,  // feet
  pressure_drop_warning: 5, // hPa in 3 hours
  visibility_warning: 2,  // nautical miles
}

// Alert level definitions
const ALERT_LEVELS = {
  SAFE: 'safe',
  CAUTION: 'caution',
  WARNING: 'warning',
  DANGER: 'danger'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all bookings for the next 24 hours
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const { data: bookings, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        users (
          email,
          first_name,
          last_name,
          phone,
          notification_preferences
        ),
        captains (
          business_name,
          dock_location,
          emergency_contact
        ),
        trips (
          departure_location,
          trip_type,
          duration_hours,
          max_passengers
        )
      `)
      .eq('status', 'confirmed')
      .gte('trip_date', new Date().toISOString())
      .lte('trip_date', tomorrow.toISOString())

    if (bookingError) {
      throw bookingError
    }

    console.log(`Found ${bookings?.length || 0} bookings for weather check`)

    // Process each booking
    const alertsSent = []
    
    for (const booking of bookings || []) {
      try {
        // Determine which NOAA station to use based on location
        const station = determineNearestStation(booking.trips?.departure_location)
        
        // Fetch current weather data from NOAA
        const weatherData = await fetchNOAABuoyData(station)
        
        // Analyze weather conditions
        const analysis = analyzeWeatherConditions(weatherData)
        
        // Determine if alert is needed
        if (analysis.alertLevel !== ALERT_LEVELS.SAFE) {
          // Send alert email
          const emailSent = await sendWeatherAlert(
            booking,
            weatherData,
            analysis,
            supabaseClient
          )
          
          if (emailSent) {
            alertsSent.push({
              bookingId: booking.id,
              userId: booking.user_id,
              alertLevel: analysis.alertLevel,
              conditions: analysis.conditions
            })
            
            // Log notification in database
            await supabaseClient
              .from('notification_log')
              .insert({
                user_id: booking.user_id,
                type: 'weather_alert',
                channel: 'email',
                subject: `Weather Alert: ${analysis.alertLevel.toUpperCase()}`,
                content: analysis.summary,
                metadata: {
                  booking_id: booking.id,
                  alert_level: analysis.alertLevel,
                  weather_data: weatherData
                }
              })
          }
        }
        
        // Update booking with weather check
        await supabaseClient
          .from('bookings')
          .update({
            last_weather_check: new Date().toISOString(),
            weather_alert_level: analysis.alertLevel,
            weather_conditions: analysis.conditions
          })
          .eq('id', booking.id)
          
      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingsChecked: bookings?.length || 0,
        alertsSent: alertsSent.length,
        alerts: alertsSent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
    
  } catch (error) {
    console.error('Weather alert error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/**
 * Fetch real-time buoy data from NOAA
 */
async function fetchNOAABuoyData(stationId) {
  try {
    // Fetch standard meteorological data
    const metResponse = await fetch(`${NOAA_BUOY_API}/${stationId}.txt`)
    const metData = await metResponse.text()
    
    // Parse the data (NOAA format is space-delimited)
    const lines = metData.split('\n')
    const headers = lines[0].replace('#', '').trim().split(/\s+/)
    const currentData = lines[2].trim().split(/\s+/) // Most recent reading
    
    // Map to object
    const weatherData = {}
    headers.forEach((header, index) => {
      weatherData[header.toLowerCase()] = currentData[index]
    })
    
    // Fetch wave data if available
    try {
      const waveResponse = await fetch(`${NOAA_BUOY_API}/${stationId}.spec`)
      const waveData = await waveResponse.text()
      const waveLines = waveData.split('\n')
      const waveHeaders = waveLines[0].replace('#', '').trim().split(/\s+/)
      const currentWaveData = waveLines[2].trim().split(/\s+/)
      
      waveHeaders.forEach((header, index) => {
        weatherData[`wave_${header.toLowerCase()}`] = currentWaveData[index]
      })
    } catch (waveError) {
      console.log('Wave data not available for station', stationId)
    }
    
    // Convert and clean data
    return {
      station_id: stationId,
      timestamp: new Date().toISOString(),
      wind_speed_kt: parseFloat(weatherData.wspd) || 0,
      wind_gust_kt: parseFloat(weatherData.gst) || 0,
      wind_direction: parseFloat(weatherData.wdir) || 0,
      wave_height_ft: parseFloat(weatherData.wvht) * 3.28084 || 0, // Convert meters to feet
      wave_period_sec: parseFloat(weatherData.dpd) || 0,
      air_pressure_hpa: parseFloat(weatherData.pres) || 1013,
      air_temp_f: parseFloat(weatherData.atmp) * 9/5 + 32 || 0, // Convert C to F
      water_temp_f: parseFloat(weatherData.wtmp) * 9/5 + 32 || 0,
      visibility_nm: parseFloat(weatherData.vis) * 0.539957 || 10, // Convert km to nautical miles
    }
  } catch (error) {
    console.error('Error fetching NOAA data:', error)
    // Return default safe conditions if API fails
    return {
      station_id: stationId,
      timestamp: new Date().toISOString(),
      wind_speed_kt: 0,
      wind_gust_kt: 0,
      wind_direction: 0,
      wave_height_ft: 0,
      wave_period_sec: 0,
      air_pressure_hpa: 1013,
      air_temp_f: 75,
      water_temp_f: 72,
      visibility_nm: 10,
      api_error: true
    }
  }
}

/**
 * Analyze weather conditions and determine alert level
 */
function analyzeWeatherConditions(weatherData) {
  const conditions = []
  let alertLevel = ALERT_LEVELS.SAFE
  
  // Check wind speed
  if (weatherData.wind_speed_kt >= WEATHER_THRESHOLDS.wind_speed_danger) {
    conditions.push({
      type: 'wind',
      severity: 'danger',
      message: `Dangerous winds: ${weatherData.wind_speed_kt} kt sustained${weatherData.wind_gust_kt > weatherData.wind_speed_kt ? `, gusting to ${weatherData.wind_gust_kt} kt` : ''}`
    })
    alertLevel = ALERT_LEVELS.DANGER
  } else if (weatherData.wind_speed_kt >= WEATHER_THRESHOLDS.wind_speed_warning) {
    conditions.push({
      type: 'wind',
      severity: 'warning',
      message: `Strong winds: ${weatherData.wind_speed_kt} kt sustained`
    })
    if (alertLevel !== ALERT_LEVELS.DANGER) alertLevel = ALERT_LEVELS.WARNING
  }
  
  // Check wave height
  if (weatherData.wave_height_ft >= WEATHER_THRESHOLDS.wave_height_danger) {
    conditions.push({
      type: 'waves',
      severity: 'danger',
      message: `Dangerous seas: ${weatherData.wave_height_ft.toFixed(1)} ft waves at ${weatherData.wave_period_sec} seconds`
    })
    alertLevel = ALERT_LEVELS.DANGER
  } else if (weatherData.wave_height_ft >= WEATHER_THRESHOLDS.wave_height_warning) {
    conditions.push({
      type: 'waves',
      severity: 'warning',
      message: `Rough seas: ${weatherData.wave_height_ft.toFixed(1)} ft waves`
    })
    if (alertLevel === ALERT_LEVELS.SAFE) alertLevel = ALERT_LEVELS.WARNING
  }
  
  // Check visibility
  if (weatherData.visibility_nm < WEATHER_THRESHOLDS.visibility_warning) {
    conditions.push({
      type: 'visibility',
      severity: 'warning',
      message: `Poor visibility: ${weatherData.visibility_nm.toFixed(1)} nautical miles`
    })
    if (alertLevel === ALERT_LEVELS.SAFE) alertLevel = ALERT_LEVELS.CAUTION
  }
  
  // Generate recommendations based on conditions
  const recommendations = generateRecommendations(alertLevel, conditions, weatherData)
  
  // Create summary
  let summary = 'Current conditions are '
  switch (alertLevel) {
    case ALERT_LEVELS.DANGER:
      summary += 'DANGEROUS for charter operations. '
      break
    case ALERT_LEVELS.WARNING:
      summary += 'HAZARDOUS and require extreme caution. '
      break
    case ALERT_LEVELS.CAUTION:
      summary += 'marginal and require caution. '
      break
    default:
      summary += 'favorable for charter operations. '
  }
  
  if (conditions.length > 0) {
    summary += conditions.map(c => c.message).join('. ') + '.'
  }
  
  return {
    alertLevel,
    conditions,
    recommendations,
    summary,
    details: weatherData
  }
}

/**
 * Generate safety recommendations based on conditions
 */
function generateRecommendations(alertLevel, conditions, weatherData) {
  const recommendations = []
  
  switch (alertLevel) {
    case ALERT_LEVELS.DANGER:
      recommendations.push('STRONGLY RECOMMEND CANCELING OR RESCHEDULING')
      recommendations.push('Conditions exceed safe operating limits for most vessels')
      recommendations.push('Contact captain immediately to discuss options')
      break
      
    case ALERT_LEVELS.WARNING:
      recommendations.push('Consider rescheduling if you have health conditions or get seasick easily')
      recommendations.push('Only experienced captains should operate in these conditions')
      recommendations.push('Expect rough seas and potential trip modifications')
      break
      
    case ALERT_LEVELS.CAUTION:
      recommendations.push('Conditions are fishable but may be uncomfortable')
      recommendations.push('Take seasickness medication if prone to motion sickness')
      recommendations.push('Captain may modify trip plans for safety')
      break
      
    default:
      recommendations.push('Conditions look great for your trip!')
      recommendations.push('Remember sunscreen and stay hydrated')
  }
  
  // Add specific recommendations based on conditions
  const hasHighWind = conditions.some(c => c.type === 'wind' && c.severity === 'danger')
  const hasHighWaves = conditions.some(c => c.type === 'waves' && c.severity === 'danger')
  
  if (hasHighWind && hasHighWaves) {
    recommendations.push('Small craft advisory likely in effect')
  }
  
  if (weatherData.visibility_nm < 2) {
    recommendations.push('Reduced visibility may delay departure')
  }
  
  return recommendations
}

/**
 * Send weather alert email
 */
async function sendWeatherAlert(booking, weatherData, analysis, supabaseClient) {
  try {
    const emailHtml = generateAlertEmailHtml(booking, weatherData, analysis)
    
    // Send via SMTP (configure your provider)
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: booking.users.email }],
        }],
        from: {
          email: 'alerts@gulfcoastcharters.com',
          name: 'Gulf Coast Charters Weather Service'
        },
        subject: `⚠️ ${analysis.alertLevel.toUpperCase()} WEATHER ALERT: Your trip on ${formatDate(booking.trip_date)}`,
        content: [{
          type: 'text/html',
          value: emailHtml
        }]
      })
    })
    
    return response.ok
    
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Generate HTML email for weather alert
 */
function generateAlertEmailHtml(booking, weatherData, analysis) {
  const alertColor = {
    [ALERT_LEVELS.DANGER]: '#dc2626',
    [ALERT_LEVELS.WARNING]: '#f59e0b',
    [ALERT_LEVELS.CAUTION]: '#3b82f6',
    [ALERT_LEVELS.SAFE]: '#10b981'
  }[analysis.alertLevel]
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weather Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: ${alertColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">⚠️ ${analysis.alertLevel.toUpperCase()} WEATHER ALERT</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">For your trip on ${formatDate(booking.trip_date)}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: ${alertColor}; margin-top: 0;">Hi ${booking.users.first_name},</h2>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: ${alertColor};">Current Conditions</h3>
      <p style="font-size: 16px; font-weight: 500; margin: 10px 0;">${analysis.summary}</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Wind Speed:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${weatherData.wind_speed_kt} kt ${weatherData.wind_gust_kt > weatherData.wind_speed_kt ? `(gusting ${weatherData.wind_gust_kt} kt)` : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Wave Height:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${weatherData.wave_height_ft.toFixed(1)} ft @ ${weatherData.wave_period_sec} sec</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Visibility:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${weatherData.visibility_nm.toFixed(1)} nm</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Air Pressure:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${weatherData.air_pressure_hpa} hPa</td>
        </tr>
        <tr>
          <td style="padding: 8px;"><strong>Water Temp:</strong></td>
          <td style="padding: 8px;">${weatherData.water_temp_f.toFixed(1)}°F</td>
        </tr>
      </table>
    </div>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Our Recommendations</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${analysis.recommendations.map(r => `<li style="margin: 5px 0;">${r}</li>`).join('')}
      </ul>
    </div>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Your Booking Details</h3>
      <p><strong>Captain:</strong> ${booking.captains.business_name}</p>
      <p><strong>Departure:</strong> ${booking.trips.departure_location}</p>
      <p><strong>Trip Type:</strong> ${booking.trips.trip_type}</p>
      <p><strong>Duration:</strong> ${booking.trips.duration_hours} hours</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://gulfcoastcharters.com/bookings/${booking.id}" style="display: inline-block; background: ${alertColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Manage My Booking</a>
      
      <a href="https://gulfcoastcharters.com/weather" style="display: inline-block; background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-left: 10px;">View Full Forecast</a>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
      <p>This is an automated weather safety alert from Gulf Coast Charters.</p>
      <p>Data source: NOAA Buoy ${weatherData.station_id} • Updated: ${formatTime(weatherData.timestamp)}</p>
      <p style="margin-top: 15px;">
        <a href="https://gulfcoastcharters.com/preferences" style="color: #3b82f6; text-decoration: none;">Update Alert Preferences</a> • 
        <a href="https://gulfcoastcharters.com/unsubscribe" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Determine nearest NOAA station based on location
 */
function determineNearestStation(location) {
  // Simple mapping - in production, use actual lat/lon distance calculation
  const locationMap = {
    'orange beach': NOAA_STATIONS.orange_beach,
    'gulf shores': NOAA_STATIONS.orange_beach,
    'mobile': NOAA_STATIONS.mobile_bay,
    'dauphin island': NOAA_STATIONS.dauphin_island,
    'pensacola': NOAA_STATIONS.pensacola,
    'biloxi': NOAA_STATIONS.mississippi_sound,
    'gulfport': NOAA_STATIONS.mississippi_sound,
  }
  
  const locationLower = (location || '').toLowerCase()
  for (const [key, station] of Object.entries(locationMap)) {
    if (locationLower.includes(key)) {
      return station
    }
  }
  
  // Default to Orange Beach
  return NOAA_STATIONS.orange_beach
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format time for display
 */
function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}
