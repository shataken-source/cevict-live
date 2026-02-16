import { NextRequest, NextResponse } from 'next/server';

// Radio Browser API - Free, open-source radio station database
// Docs: https://www.radio-browser.info/
const RADIO_API_BASE = 'https://de1.api.radio-browser.info/json';

interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  votes: number;
  lastchangetime: string;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  lastchecktime: string;
  clickcount: number;
  clicktrend: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zipCode = searchParams.get('zip');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  try {
    let stations: RadioStation[] = [];

    // If we have coordinates, use them for precise local search
    if (lat && lon) {
      const response = await fetch(
        `${RADIO_API_BASE}/stations/search?latitude=${lat}&longitude=${lon}&distance=50&order=votes&reverse=true&limit=20`,
        {
          headers: {
            'User-Agent': 'WildReadyCampingApp/1.0',
          },
          next: { revalidate: 3600 } // Cache for 1 hour
        }
      );

      if (response.ok) {
        stations = await response.json();
      }
    }

    // Fallback: Search by state/region derived from ZIP or use default US stations
    if (stations.length === 0) {
      // Get state from ZIP code (simplified mapping)
      const state = getStateFromZip(zipCode || '');

      if (state) {
        // Try multiple search strategies
        const searchStrategies = [
          // Try searching by country + state
          `${RADIO_API_BASE}/stations/search?countrycode=US&state=${encodeURIComponent(state)}&order=votes&reverse=true&limit=30`,
          // Try searching by country + stateexact
          `${RADIO_API_BASE}/stations/search?countrycode=US&stateexact=${encodeURIComponent(state)}&order=votes&reverse=true&limit=30`,
        ];

        for (const url of searchStrategies) {
          try {
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'WildReadyCampingApp/1.0',
              },
              next: { revalidate: 3600 }
            });

            if (response.ok) {
              const data = await response.json();
              if (data && data.length > 0) {
                stations = data;
                break;
              }
            }
          } catch (err) {
            console.log(`Radio search failed for ${url}`);
          }
        }

        // If state search returned results, filter by actual state match
        if (stations.length > 0) {
          stations = stations.filter(s =>
            s.state?.toLowerCase().includes(state.toLowerCase()) ||
            s.name?.toLowerCase().includes(state.toLowerCase())
          );
        }
      }
    }

    // If still no results, use fallback curated list
    if (stations.length === 0) {
      return NextResponse.json({
        stations: getFallbackStations(zipCode || ''),
        source: 'fallback',
        message: `Showing ${getStateFromZip(zipCode || '') || 'general'} stations - Radio Browser data limited for this area`
      });
    }

    // Map to our format and filter active stations
    const mappedStations = stations
      .filter(s => s.lastcheckok === 1) // Only stations that passed last check
      .slice(0, 12) // Limit to 12 stations
      .map(station => ({
        id: station.stationuuid,
        name: cleanStationName(station.name),
        genre: formatGenre(station.tags),
        location: `${station.state || 'Unknown'}, ${station.countrycode}`,
        url: station.url_resolved || station.url,
        logo: station.favicon || null,
        bitrate: station.bitrate,
        codec: station.codec,
        votes: station.votes,
        isPopular: station.votes > 100
      }));

    // If we still have no stations, return curated fallback list
    if (mappedStations.length === 0) {
      return NextResponse.json({
        stations: getFallbackStations(zipCode || ''),
        source: 'fallback',
        message: 'Using curated station list'
      });
    }

    return NextResponse.json({
      stations: mappedStations,
      source: 'radio-browser',
      count: mappedStations.length
    });

  } catch (error) {
    console.error('Radio Browser API error:', error);

    return NextResponse.json({
      stations: getFallbackStations(zipCode || ''),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'API error'
    });
  }
}

// Clean up station name
function cleanStationName(name: string): string {
  return name
    .replace(/\.mp3$/i, '')
    .replace(/\.ogg$/i, '')
    .replace(/\s*-\s*$/, '')
    .replace(/^\s+|\s+$/g, '')
    .substring(0, 40); // Limit length
}

// Format tags into genre
function formatGenre(tags: string): string {
  if (!tags) return 'General';

  const tagList = tags.split(',').map(t => t.trim()).filter(t => t);

  // Map common tags to display genres
  const genreMap: Record<string, string> = {
    'news': 'News/Talk',
    'talk': 'News/Talk',
    'sports': 'Sports',
    'music': 'Music',
    'classical': 'Classical',
    'rock': 'Rock',
    'country': 'Country',
    'jazz': 'Jazz',
    'religious': 'Religious',
    'christian': 'Christian',
    'public radio': 'Public Radio',
    'npr': 'NPR',
    'weather': 'Weather'
  };

  for (const [key, value] of Object.entries(genreMap)) {
    if (tagList.some(t => t.toLowerCase().includes(key))) {
      return value;
    }
  }

  // Return first tag as genre, capitalized
  return tagList[0] ? tagList[0].charAt(0).toUpperCase() + tagList[0].slice(1) : 'General';
}

// Get state from ZIP code (comprehensive US ZIP code mapping)
function getStateFromZip(zip: string): string | null {
  if (!zip || zip.length < 3) return null;

  const prefix = parseInt(zip.substring(0, 3));

  // Comprehensive ZIP prefix to state mapping
  if (prefix >= 350 && prefix <= 369) return 'Alabama';
  if (prefix >= 995 && prefix <= 999) return 'Alaska';
  if (prefix >= 850 && prefix <= 865) return 'Arizona';
  if (prefix >= 716 && prefix <= 729) return 'Arkansas';
  if (prefix >= 900 && prefix <= 961) return 'California';
  if (prefix >= 800 && prefix <= 816) return 'Colorado';
  if (prefix >= 600 && prefix <= 629) return 'Illinois';
  if (prefix >= 460 && prefix <= 479) return 'Indiana';
  if (prefix >= 500 && prefix <= 528) return 'Iowa';
  if (prefix >= 660 && prefix <= 679) return 'Kansas';
  if (prefix >= 400 && prefix <= 427) return 'Kentucky';
  if (prefix >= 700 && prefix <= 715) return 'Louisiana';
  if (prefix >= 390 && prefix <= 399) return 'Mississippi';
  if (prefix >= 630 && prefix <= 658) return 'Missouri';
  if (prefix >= 590 && prefix <= 599) return 'Montana';
  if (prefix >= 680 && prefix <= 693) return 'Nebraska';
  if (prefix >= 889 && prefix <= 898) return 'Nevada';
  if (prefix >= 100 && prefix <= 149) return 'New York';
  if (prefix >= 150 && prefix <= 196) return 'Pennsylvania';
  if (prefix >= 480 && prefix <= 499) return 'Michigan';
  if (prefix >= 540 && prefix <= 549) return 'Wisconsin';
  if (prefix >= 550 && prefix <= 567) return 'Minnesota';
  if (prefix >= 570 && prefix <= 577) return 'South Dakota';
  if (prefix >= 580 && prefix <= 588) return 'North Dakota';
  if (prefix >= 870 && prefix <= 884) return 'New Mexico';
  if (prefix >= 730 && prefix <= 749) return 'Oklahoma';
  if (prefix >= 750 && prefix <= 799) return 'Texas';
  if (prefix >= 980 && prefix <= 994) return 'Washington';
  if (prefix >= 970 && prefix <= 979) return 'Oregon';
  if (prefix >= 920 && prefix <= 929) return 'California';
  if (prefix >= 300 && prefix <= 319) return 'Georgia';
  if (prefix >= 967 && prefix <= 968) return 'Hawaii';
  if (prefix >= 832 && prefix <= 838) return 'Idaho';
  if (prefix >= 320 && prefix <= 349) return 'Florida';
  if (prefix >= 200 && prefix <= 205) return 'District of Columbia';

  // Camping regions (specific overrides)
  if (prefix >= 820 && prefix <= 831) return 'Wyoming'; // Yellowstone
  if (prefix >= 247 && prefix <= 268) return 'West Virginia';
  if (prefix >= 377 && prefix <= 379) return 'Tennessee'; // Smokies

  return null;
}

// Fallback stations for when API fails - organized by region
function getFallbackStations(zip: string) {
  const zipPrefix = parseInt(zip.substring(0, 3));

  // Regional station databases
  const regions: Record<string, any[]> = {
    yellowstone: [
      { id: '1', name: 'Yellowstone Public Radio', genre: 'Public Radio', location: 'Wyoming, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 500, isPopular: true },
      { id: '2', name: 'KPRK 107.9', genre: 'Country', location: 'Montana, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 200, isPopular: true },
      { id: '3', name: 'K-Sky 96.7', genre: 'Rock', location: 'Montana, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 150, isPopular: false },
      { id: '4', name: 'KBOZ 1090 AM', genre: 'News/Talk', location: 'Montana, US', url: '', logo: null, bitrate: 64, codec: 'MP3', votes: 300, isPopular: true },
      { id: '5', name: 'KGLT 91.9', genre: 'College Radio', location: 'Montana, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 100, isPopular: false },
    ],
    california: [
      { id: '1', name: 'KCRW 89.9', genre: 'Public Radio', location: 'California, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 800, isPopular: true },
      { id: '2', name: 'KPCC 89.3', genre: 'News/Talk', location: 'California, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 700, isPopular: true },
      { id: '3', name: 'KQED 88.5', genre: 'Public Radio', location: 'California, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 750, isPopular: true },
      { id: '4', name: 'KROQ 106.7', genre: 'Rock', location: 'California, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 600, isPopular: true },
      { id: '5', name: 'KIIS 102.7', genre: 'Pop', location: 'California, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 550, isPopular: true },
    ],
    newyork: [
      { id: '1', name: 'WNYC 93.9', genre: 'Public Radio', location: 'New York, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 900, isPopular: true },
      { id: '2', name: 'WQXR 105.9', genre: 'Classical', location: 'New York, US', url: '', logo: null, bitrate: 192, codec: 'MP3', votes: 650, isPopular: true },
      { id: '3', name: 'Hot 97', genre: 'Hip Hop', location: 'New York, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 700, isPopular: true },
      { id: '4', name: 'Z100 100.3', genre: 'Pop', location: 'New York, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 750, isPopular: true },
    ],
    texas: [
      { id: '1', name: 'KUT 90.5', genre: 'Public Radio', location: 'Texas, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 600, isPopular: true },
      { id: '2', name: 'KERA 90.1', genre: 'Public Radio', location: 'Texas, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 550, isPopular: true },
      { id: '3', name: '98.1 The Bull', genre: 'Country', location: 'Texas, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 500, isPopular: true },
      { id: '4', name: '93.7 The Beat', genre: 'Hip Hop', location: 'Texas, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 450, isPopular: true },
    ],
    florida: [
      { id: '1', name: 'WLRN 91.3', genre: 'Public Radio', location: 'Florida, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 500, isPopular: true },
      { id: '2', name: '89.3 WPBI', genre: 'News/Talk', location: 'Florida, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 450, isPopular: true },
      { id: '3', name: '99.9 KISS FM', genre: 'Pop', location: 'Florida, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 480, isPopular: true },
      { id: '4', name: '95.7 The Beat', genre: 'Hip Hop', location: 'Florida, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 420, isPopular: true },
    ],
    illinois: [
      { id: '1', name: 'WBEZ 91.5', genre: 'Public Radio', location: 'Illinois, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 700, isPopular: true },
      { id: '2', name: 'WGN 720 AM', genre: 'News/Talk', location: 'Illinois, US', url: '', logo: null, bitrate: 64, codec: 'MP3', votes: 650, isPopular: true },
      { id: '3', name: '101.9 The Mix', genre: 'Adult Contemporary', location: 'Illinois, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 550, isPopular: true },
      { id: '4', name: 'Rock 95.5', genre: 'Rock', location: 'Illinois, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 500, isPopular: true },
    ],
    pennsylvania: [
      { id: '1', name: 'WHYY 90.9', genre: 'Public Radio', location: 'Pennsylvania, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 600, isPopular: true },
      { id: '2', name: 'WITF 89.5', genre: 'Public Radio', location: 'Pennsylvania, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 500, isPopular: true },
      { id: '3', name: '98.9 Magic', genre: 'Adult Contemporary', location: 'Pennsylvania, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 450, isPopular: true },
      { id: '4', name: 'WMMR 93.3', genre: 'Rock', location: 'Pennsylvania, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 520, isPopular: true },
    ],
    westvirginia: [
      { id: '1', name: 'WV Public Radio', genre: 'Public Radio', location: 'West Virginia, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 400, isPopular: true },
      { id: '2', name: 'WVPB 88.5', genre: 'Public Radio', location: 'West Virginia, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 350, isPopular: true },
      { id: '3', name: '102.3 Mountain', genre: 'Country', location: 'West Virginia, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 300, isPopular: false },
      { id: '4', name: 'WAJR 1440 AM', genre: 'News/Talk', location: 'West Virginia, US', url: '', logo: null, bitrate: 64, codec: 'MP3', votes: 280, isPopular: false },
    ],
    tennessee: [
      { id: '1', name: 'Nashville Public Radio', genre: 'Public Radio', location: 'Tennessee, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 550, isPopular: true },
      { id: '2', name: 'WMOT 89.5', genre: 'Jazz', location: 'Tennessee, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 480, isPopular: true },
      { id: '3', name: '92.9 The Beat', genre: 'Country', location: 'Tennessee, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 520, isPopular: true },
      { id: '4', name: 'Rock 106.5', genre: 'Rock', location: 'Tennessee, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 450, isPopular: true },
    ],
    colorado: [
      { id: '1', name: 'Colorado Public Radio', genre: 'Public Radio', location: 'Colorado, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 600, isPopular: true },
      { id: '2', name: 'KGNU 88.5', genre: 'Community Radio', location: 'Colorado, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 450, isPopular: true },
      { id: '3', name: '98.1 The Bull', genre: 'Country', location: 'Colorado, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 500, isPopular: true },
      { id: '4', name: '93.3 The RIDE', genre: 'Hip Hop', location: 'Colorado, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 480, isPopular: true },
    ],
    georgia: [
      { id: '1', name: 'Georgia Public Radio', genre: 'Public Radio', location: 'Georgia, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 550, isPopular: true },
      { id: '2', name: 'WABE 90.1', genre: 'Classical', location: 'Georgia, US', url: '', logo: null, bitrate: 192, codec: 'MP3', votes: 500, isPopular: true },
      { id: '3', name: 'V-103 103.3', genre: 'Urban', location: 'Georgia, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 600, isPopular: true },
      { id: '4', name: '99X 98.9', genre: 'Alternative', location: 'Georgia, US', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 520, isPopular: true },
    ],
  };

  // Determine region from ZIP
  if (zipPrefix >= 820 && zipPrefix <= 831) {
    return regions.yellowstone;
  }
  if ((zipPrefix >= 900 && zipPrefix <= 961) || (zipPrefix >= 920 && zipPrefix <= 929)) {
    return regions.california;
  }
  if (zipPrefix >= 100 && zipPrefix <= 149) {
    return regions.newyork;
  }
  if (zipPrefix >= 750 && zipPrefix <= 799) {
    return regions.texas;
  }
  if (zipPrefix >= 320 && zipPrefix <= 349) {
    return regions.florida;
  }
  if (zipPrefix >= 600 && zipPrefix <= 629) {
    return regions.illinois;
  }
  if (zipPrefix >= 150 && zipPrefix <= 196) {
    return regions.pennsylvania;
  }
  if (zipPrefix >= 247 && zipPrefix <= 268) {
    return regions.westvirginia;
  }
  if (zipPrefix >= 370 && zipPrefix <= 385) {
    return regions.tennessee;
  }
  if (zipPrefix >= 800 && zipPrefix <= 816) {
    return regions.colorado;
  }
  if (zipPrefix >= 300 && zipPrefix <= 319) {
    return regions.georgia;
  }

  // Default national stations if no region matched
  return [
    { id: '1', name: 'NPR News', genre: 'News/Talk', location: 'National', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 5000, isPopular: true },
    { id: '2', name: 'K-LOVE', genre: 'Christian', location: 'National', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 4000, isPopular: true },
    { id: '3', name: 'iHeartCountry', genre: 'Country', location: 'National', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 3000, isPopular: true },
    { id: '4', name: 'Classic Rock Radio', genre: 'Rock', location: 'National', url: '', logo: null, bitrate: 128, codec: 'MP3', votes: 2500, isPopular: true },
    { id: '5', name: 'Classical Music', genre: 'Classical', location: 'National', url: '', logo: null, bitrate: 192, codec: 'MP3', votes: 2000, isPopular: true },
    { id: '6', name: 'NOAA Weather Radio', genre: 'Weather Alerts', location: 'National', url: '', logo: null, bitrate: 64, codec: 'MP3', votes: 5000, isPopular: true },
  ];
}
