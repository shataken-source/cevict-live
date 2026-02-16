import { NextRequest, NextResponse } from 'next/server';

// NWS Weather API - Weather alerts including fire weather warnings
// Docs: https://api.weather.gov/alerts
const NWS_API_BASE = 'https://api.weather.gov';

interface NWSAlert {
  id: string;
  areaDesc: string;
  sent: string;
  effective: string;
  onset: string;
  expires: string;
  ends: string;
  status: string;
  messageType: string;
  category: string;
  severity: string;
  certainty: string;
  urgency: string;
  event: string;
  sender: string;
  senderName: string;
  headline: string;
  description: string;
  instruction?: string;
  response: string;
  parameters?: {
    NWSheadline?: string[];
    VTEC?: string[];
    eventEndingTime?: string[];
    expiredReferences?: string[];
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat') || '44.5';
  const lon = searchParams.get('lon') || '-110.0';

  try {
    let alerts: NWSAlert[] = [];
    let source = 'nws';

    // Try to get real NWS alerts
    const response = await fetch(
      `${NWS_API_BASE}/alerts/active?point=${lat},${lon}`,
      {
        headers: {
          'User-Agent': 'WildReadyCampingApp/1.0 (wildready@camping.app)',
          'Accept': 'application/geo+json'
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (response.ok) {
      const data = await response.json();
      alerts = data.features?.map((f: any) => f.properties) || [];
    } else {
      // If NWS fails, use mock data
      alerts = getMockAlerts(parseFloat(lat), parseFloat(lon));
      source = 'mock';
    }

    // Filter and categorize alerts
    const fireAlerts = alerts.filter(a => 
      a.event?.toLowerCase().includes('fire') || 
      a.event?.toLowerCase().includes('red flag') ||
      a.event?.toLowerCase().includes('burn ban')
    );

    const weatherAlerts = alerts.filter(a => 
      !a.event?.toLowerCase().includes('fire') && !a.event?.toLowerCase().includes('red flag')
    );

    // Map to our format
    const mappedAlerts = [...fireAlerts, ...weatherAlerts].map(alert => ({
      id: alert.id,
      title: alert.event,
      headline: alert.headline || alert.event,
      description: alert.description,
      instruction: alert.instruction,
      severity: mapSeverity(alert.severity),
      urgency: alert.urgency,
      area: alert.areaDesc,
      effective: alert.effective,
      expires: alert.expires,
      sender: alert.senderName,
      isFireRelated: alert.event?.toLowerCase().includes('fire') || 
                     alert.event?.toLowerCase().includes('red flag'),
      category: getCategory(alert.event)
    }));

    // If no alerts, return mock data for demo
    if (mappedAlerts.length === 0) {
      const mockAlerts = getMockAlerts(parseFloat(lat), parseFloat(lon));
      return NextResponse.json({
        alerts: mockAlerts.map(a => ({
          id: a.id,
          title: a.event,
          headline: a.headline || a.event,
          description: a.description,
          instruction: a.instruction,
          severity: mapSeverity(a.severity),
          urgency: a.urgency,
          area: a.areaDesc,
          effective: a.effective,
          expires: a.expires,
          sender: a.senderName,
          isFireRelated: a.event?.toLowerCase().includes('fire') || 
                         a.event?.toLowerCase().includes('red flag'),
          category: getCategory(a.event)
        })),
        count: mockAlerts.length,
        source: 'mock',
        message: 'Using sample alerts for demonstration'
      });
    }

    return NextResponse.json({
      alerts: mappedAlerts,
      count: mappedAlerts.length,
      source,
      fireAlerts: mappedAlerts.filter(a => a.isFireRelated).length,
      weatherAlerts: mappedAlerts.filter(a => !a.isFireRelated).length,
      updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('NWS Weather API error:', error);
    
    // Return mock data on error
    const mockAlerts = getMockAlerts(parseFloat(lat), parseFloat(lon));
    
    return NextResponse.json({
      alerts: mockAlerts.map(a => ({
        id: a.id,
        title: a.event,
        headline: a.headline || a.event,
        description: a.description,
        instruction: a.instruction,
        severity: mapSeverity(a.severity),
        urgency: a.urgency,
        area: a.areaDesc,
        effective: a.effective,
        expires: a.expires,
        sender: a.senderName,
        isFireRelated: a.event?.toLowerCase().includes('fire') || 
                       a.event?.toLowerCase().includes('red flag'),
        category: getCategory(a.event)
      })),
      count: mockAlerts.length,
      source: 'mock',
      error: error instanceof Error ? error.message : 'API error'
    });
  }
}

function mapSeverity(severity: string): string {
  const severityMap: Record<string, string> = {
    'Extreme': 'critical',
    'Severe': 'severe',
    'Moderate': 'moderate',
    'Minor': 'minor',
    'Unknown': 'unknown'
  };
  return severityMap[severity] || 'unknown';
}

function getCategory(event?: string): string {
  if (!event) return 'other';
  
  const eventLower = event.toLowerCase();
  
  if (eventLower.includes('fire') || eventLower.includes('red flag')) return 'fire';
  if (eventLower.includes('thunderstorm') || eventLower.includes('tornado')) return 'severe-weather';
  if (eventLower.includes('flood') || eventLower.includes('flash')) return 'flood';
  if (eventLower.includes('wind') || eventLower.includes('blow')) return 'wind';
  if (eventLower.includes('heat') || eventLower.includes('excessive')) return 'heat';
  if (eventLower.includes('winter') || eventLower.includes('snow') || eventLower.includes('ice')) return 'winter';
  if (eventLower.includes('air quality') || eventLower.includes('smoke')) return 'air-quality';
  
  return 'other';
}

function getMockAlerts(lat: number, lon: number): NWSAlert[] {
  const location = getLocationName(lat, lon);
  
  // Yellowstone area - low fire risk, mostly weather
  if (lat > 44 && lat < 45 && lon > -111 && lon < -109) {
    return [
      {
        id: 'NWS-1',
        areaDesc: `${location}, WY/MT`,
        sent: new Date().toISOString(),
        effective: new Date().toISOString(),
        onset: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ends: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'Actual',
        messageType: 'Alert',
        category: 'Met',
        severity: 'Moderate',
        certainty: 'Likely',
        urgency: 'Expected',
        event: 'Red Flag Warning',
        sender: 'NWS',
        senderName: 'National Weather Service - Billings',
        headline: 'Red Flag Warning issued for dry conditions',
        description: 'Critical fire weather conditions expected due to low humidity and gusty winds. Outdoor burning is not recommended. Campfires should be extinguished completely.',
        instruction: 'Avoid outdoor burning. Keep campfires small and contained. Have water and shovel nearby.',
        response: 'Execute',
        parameters: {
          NWSheadline: ['Red Flag Warning in effect until 8 PM MDT']
        }
      },
      {
        id: 'NWS-2',
        areaDesc: `${location}, WY`,
        sent: new Date().toISOString(),
        effective: new Date().toISOString(),
        onset: new Date().toISOString(),
        expires: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        ends: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        status: 'Actual',
        messageType: 'Alert',
        category: 'Met',
        severity: 'Minor',
        certainty: 'Likely',
        urgency: 'Expected',
        event: 'Wind Advisory',
        sender: 'NWS',
        senderName: 'National Weather Service - Billings',
        headline: 'Wind Advisory issued',
        description: 'Winds 25-35 mph with gusts up to 45 mph expected. Secure loose objects at campsite.',
        instruction: 'Secure tents and loose camping equipment. Avoid areas with dead trees.',
        response: 'Prepare',
        parameters: {}
      }
    ];
  }
  
  // California - high fire risk
  if (lat > 32 && lat < 42 && lon > -124 && lon < -114) {
    return [
      {
        id: 'NWS-CA-1',
        areaDesc: 'Northern California',
        sent: new Date().toISOString(),
        effective: new Date().toISOString(),
        onset: new Date().toISOString(),
        expires: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        ends: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        status: 'Actual',
        messageType: 'Alert',
        category: 'Met',
        severity: 'Severe',
        certainty: 'Likely',
        urgency: 'Expected',
        event: 'Fire Weather Watch',
        sender: 'NWS',
        senderName: 'National Weather Service - Sacramento',
        headline: 'Fire Weather Watch in effect',
        description: 'Critical fire weather conditions are possible. Low humidity, high temperatures, and gusty winds may lead to rapid fire spread. All outdoor burning is prohibited.',
        instruction: 'No outdoor burning. Be prepared to evacuate if fire develops. Monitor local fire department communications.',
        response: 'Prepare',
        parameters: {}
      },
      {
        id: 'NWS-CA-2',
        areaDesc: 'Northern California',
        sent: new Date().toISOString(),
        effective: new Date().toISOString(),
        onset: new Date().toISOString(),
        expires: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        ends: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        status: 'Actual',
        messageType: 'Alert',
        category: 'Met',
        severity: 'Minor',
        certainty: 'Likely',
        urgency: 'Expected',
        event: 'Air Quality Alert',
        sender: 'NWS',
        senderName: 'National Weather Service - Sacramento',
        headline: 'Air Quality Alert due to smoke',
        description: 'Smoke from distant wildfires may cause poor air quality. Sensitive groups should limit outdoor activity.',
        instruction: 'Limit outdoor activities. Keep windows closed if in RV. Use air purifier if available.',
        response: 'Avoid',
        parameters: {}
      }
    ];
  }
  
  // Default alerts
  return [
    {
      id: 'NWS-DEFAULT',
      areaDesc: 'Your Location',
      sent: new Date().toISOString(),
      effective: new Date().toISOString(),
      onset: new Date().toISOString(),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ends: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'Actual',
      messageType: 'Alert',
      category: 'Met',
      severity: 'Minor',
      certainty: 'Possible',
      urgency: 'Future',
      event: 'Fire Weather Watch',
      sender: 'NWS',
      senderName: 'National Weather Service',
      headline: 'Fire Weather Watch - Be Prepared',
      description: 'Conditions may become favorable for wildfire spread. Monitor local conditions and have evacuation plan ready.',
      instruction: 'Check local burn bans. Have emergency kit ready. Monitor weather updates.',
      response: 'Prepare',
      parameters: {}
    }
  ];
}

function getLocationName(lat: number, lon: number): string {
  if (lat > 44 && lat < 45 && lon > -111 && lon < -109) return 'Yellowstone';
  if (lat > 37 && lat < 41 && lon > -83 && lon < -77) return 'West Virginia';
  if (lat > 32 && lat < 42 && lon > -124 && lon < -114) return 'California';
  if (lat > 35 && lat < 37 && lon > -89 && lon < -81) return 'Tennessee';
  if (lat > 38 && lat < 41 && lon > -105 && lon < -102) return 'Colorado';
  return 'Your Location';
}
