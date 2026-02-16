import { NextRequest, NextResponse } from 'next/server';

// Schedules Direct API Configuration
const SD_API_BASE = 'https://json.schedulesdirect.org/20141201';

interface SDLineup {
  lineup: string;
  modified: string;
  uri: string;
}

interface SDStation {
  stationID: string;
  name: string;
  callsign: string;
  affiliate?: string;
  broadcastLanguage?: string[];
  descriptionLanguage?: string[];
  logo?: {
    URL: string;
    width: number;
    height: number;
    md5: string;
  };
  channel?: string;
}

interface SDProgram {
  programID: string;
  titles: { title120: string }[];
  episodeTitle150?: string;
  showType?: string;
  programLength?: string;
  airDateTime?: string;
  duration?: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zipCode = searchParams.get('zip');
  
  if (!zipCode) {
    return NextResponse.json(
      { error: 'ZIP code required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.SCHEDULES_DIRECT_API_KEY;
  
  if (!apiKey) {
    // Fallback to mock data if no API key
    return NextResponse.json({
      channels: getMockChannels(zipCode),
      source: 'mock',
      message: 'Schedules Direct API key not configured. Using sample data.'
    });
  }

  try {
    // Step 1: Get lineup by ZIP code (using OTA lineups)
    // For OTA, we use the POST code to find the lineup
    const lineupResponse = await fetch(`${SD_API_BASE}/lineups/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey
      },
      body: JSON.stringify({
        postcode: zipCode,
        country: 'USA'
      })
    });

    if (!lineupResponse.ok) {
      throw new Error(`Lineup request failed: ${lineupResponse.status}`);
    }

    const lineups: SDLineup[] = await lineupResponse.json();
    
    if (!lineups || lineups.length === 0) {
      return NextResponse.json({
        channels: getMockChannels(zipCode),
        source: 'mock',
        message: 'No OTA lineups found for this ZIP code. Using sample data.'
      });
    }

    // Use the first available lineup
    const lineupUri = lineups[0].uri;

    // Step 2: Get stations/channels from lineup
    const stationsResponse = await fetch(`${SD_API_BASE}${lineupUri}`, {
      headers: {
        'token': apiKey
      }
    });

    if (!stationsResponse.ok) {
      throw new Error(`Stations request failed: ${stationsResponse.status}`);
    }

    const stationsData = await stationsResponse.json();
    const stations: SDStation[] = stationsData.map?.stations || stationsData.stations || [];

    if (!stations || stations.length === 0) {
      return NextResponse.json({
        channels: getMockChannels(zipCode),
        source: 'mock',
        message: 'No stations found in lineup. Using sample data.'
      });
    }

    // Step 3: Get current program schedules
    const now = new Date();
    const endTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours ahead
    
    const scheduleRequest = {
      stationIDs: stations.slice(0, 20).map(s => s.stationID), // Limit to first 20 stations
      date: now.toISOString().split('T')[0].replace(/-/g, '-')
    };

    const scheduleResponse = await fetch(`${SD_API_BASE}/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey
      },
      body: JSON.stringify([scheduleRequest])
    });

    let programs: SDProgram[] = [];
    if (scheduleResponse.ok) {
      const schedules = await scheduleResponse.json();
      // Extract unique programs
      const programIDs = new Set<string>();
      schedules.forEach((schedule: any) => {
        schedule.programs?.forEach((p: any) => {
          programIDs.add(p.programID);
        });
      });
      
      // Fetch program details
      if (programIDs.size > 0) {
        const programsResponse = await fetch(`${SD_API_BASE}/programs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': apiKey
          },
          body: JSON.stringify(Array.from(programIDs).slice(0, 50))
        });
        
        if (programsResponse.ok) {
          programs = await programsResponse.json();
        }
      }
    }

    // Map stations to our channel format
    const channels = stations.slice(0, 16).map((station, index) => {
      const program = programs.find(p => 
        schedules.find((s: any) => 
          s.programs?.find((sp: any) => 
            sp.programID === p.programID && sp.stationID === station.stationID
          )
        )
      );

      return {
        number: station.channel || `${index + 1}.1`,
        name: station.callsign || station.name,
        affiliate: station.affiliate,
        type: getChannelType(station.callsign),
        signal: getSignalStrength(index),
        show: program?.titles?.[0]?.title120 || getDefaultShow(station.callsign),
        logo: station.logo?.URL || null
      };
    });

    return NextResponse.json({
      channels,
      source: 'schedules-direct',
      lineup: lineupUri,
      count: channels.length
    });

  } catch (error) {
    console.error('Schedules Direct API error:', error);
    
    // Fallback to mock data on error
    return NextResponse.json({
      channels: getMockChannels(zipCode),
      source: 'mock',
      error: error instanceof Error ? error.message : 'API error',
      message: 'Failed to fetch real data. Using sample channels.'
    });
  }
}

function getChannelType(callsign?: string): string {
  if (!callsign) return 'digital';
  const majorNetworks = ['CBS', 'NBC', 'ABC', 'FOX', 'PBS'];
  if (majorNetworks.some(n => callsign.includes(n))) return 'network';
  return 'digital';
}

function getSignalStrength(index: number): string {
  if (index < 4) return 'excellent';
  if (index < 8) return 'good';
  return 'fair';
}

function getDefaultShow(callsign?: string): string {
  const shows: Record<string, string> = {
    'CBS': 'Evening News',
    'NBC': 'Nightly News',
    'ABC': 'World News',
    'FOX': 'Local News',
    'PBS': 'Nature Documentary',
    'MeTV': 'Classic Sitcoms',
    'Weather': '24/7 Weather Radar',
    'Movies!': 'Classic Movies'
  };
  
  if (!callsign) return 'Local Programming';
  
  for (const [network, show] of Object.entries(shows)) {
    if (callsign.includes(network)) return show;
  }
  
  return 'Local Programming';
}

function getMockChannels(zipCode: string) {
  // Return context-appropriate mock channels based on ZIP
  const zipPrefix = zipCode.substring(0, 3);
  
  // Mountain West (Yellowstone area)
  if (zipPrefix >= '820' && zipPrefix <= '831') {
    return [
      { number: '2.1', name: 'KTVQ', affiliate: 'CBS', type: 'network', signal: 'good', show: 'Evening News 6:00 PM', logo: null },
      { number: '4.1', name: 'KULR', affiliate: 'NBC', type: 'network', signal: 'fair', show: 'Nightly News 6:30 PM', logo: null },
      { number: '5.1', name: 'KXLF', affiliate: 'CBS', type: 'network', signal: 'good', show: 'World News 5:30 PM', logo: null },
      { number: '6.1', name: 'KPAX', affiliate: 'CBS', type: 'network', signal: 'excellent', show: 'Local News 5:00 PM', logo: null },
      { number: '7.1', name: 'KBYU', affiliate: 'PBS', type: 'network', signal: 'excellent', show: 'Nature Documentary 7:00 PM', logo: null },
      { number: '8.1', name: 'KIFI', affiliate: 'ABC', type: 'network', signal: 'good', show: 'World News Tonight', logo: null },
      { number: '10.1', name: 'KZMN', type: 'digital', signal: 'fair', show: 'Montana PBS', logo: null },
      { number: '12.1', name: 'KMCA', type: 'digital', signal: 'good', show: 'MeTV Classics', logo: null },
      { number: '14.1', name: 'KTMF', affiliate: 'FOX', type: 'network', signal: 'fair', show: 'Local News 9:00 PM', logo: null },
      { number: '16.1', name: 'KWYB', affiliate: 'ABC', type: 'network', signal: 'good', show: 'News at 10', logo: null },
      { number: '18.1', name: 'KDBZ', type: 'digital', signal: 'good', show: 'The Weather Channel', logo: null },
      { number: '20.1', name: 'KCTZ', type: 'digital', signal: 'excellent', show: '24/7 Weather Radar', logo: null },
      { number: '22.1', name: 'KBGS', type: 'digital', signal: 'fair', show: 'Movies!', logo: null },
      { number: '25.1', name: 'KHMT', type: 'digital', signal: 'fair', show: 'Classic Movies', logo: null },
      { number: '28.1', name: 'KJJC', type: 'digital', signal: 'good', show: 'Create TV', logo: null },
      { number: '32.1', name: 'KXLH', type: 'digital', signal: 'fair', show: 'Local Programming', logo: null }
    ];
  }
  
  // Default channels for other areas
  return [
    { number: '2.1', name: 'CBS', affiliate: 'CBS', type: 'network', signal: 'good', show: 'Evening News 6:00 PM', logo: null },
    { number: '4.1', name: 'NBC', affiliate: 'NBC', type: 'network', signal: 'fair', show: 'Nightly News 6:30 PM', logo: null },
    { number: '5.1', name: 'ABC', affiliate: 'ABC', type: 'network', signal: 'good', show: 'World News 5:30 PM', logo: null },
    { number: '7.1', name: 'PBS', affiliate: 'PBS', type: 'network', signal: 'excellent', show: 'Nature Documentary 7:00 PM', logo: null },
    { number: '11.1', name: 'FOX', affiliate: 'FOX', type: 'network', signal: 'fair', show: 'Local News 9:00 PM', logo: null },
    { number: '14.1', name: 'MeTV', type: 'digital', signal: 'good', show: 'Classic Sitcoms', logo: null },
    { number: '20.1', name: 'Weather', type: 'digital', signal: 'excellent', show: '24/7 Weather Radar', logo: null },
    { number: '25.1', name: 'Movies!', type: 'digital', signal: 'fair', show: 'Classic Movies', logo: null }
  ];
}
