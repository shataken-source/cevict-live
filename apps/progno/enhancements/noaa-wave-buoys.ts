/**
 * NOAA Wave Buoy Data Integration
 * Real-time wave and ocean condition data for beach safety predictions
 */

export interface WaveBuoyData {
  stationId: string;
  stationName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  waveHeight: number; // meters
  wavePeriod: number; // seconds
  waveDirection: number; // degrees
  windSpeed: number; // m/s
  windDirection: number; // degrees
  waterTemperature: number; // Celsius
  airTemperature: number; // Celsius
  pressure: number; // hPa
}

export interface BeachBuoyMapping {
  beachName: string;
  nearestBuoy: string; // Station ID
  distance: number; // km
}

/**
 * Common Gulf Coast wave buoys
 */
export const GULF_COAST_BUOYS: Record<string, { name: string; lat: number; lon: number }> = {
  '42040': { name: 'Gulf of Mexico - 42040', lat: 29.2, lon: -88.2 },
  '42039': { name: 'Gulf of Mexico - 42039', lat: 28.5, lon: -84.5 },
  '42036': { name: 'Gulf of Mexico - 42036', lat: 28.5, lon: -84.5 },
  '42035': { name: 'Gulf of Mexico - 42035', lat: 29.2, lon: -88.0 },
  '42012': { name: 'Gulf of Mexico - 42012', lat: 26.0, lon: -96.0 },
};

/**
 * Find nearest wave buoy to a beach location
 */
export function findNearestBuoy(
  beachLat: number,
  beachLon: number
): BeachBuoyMapping {
  let nearestBuoy = '';
  let minDistance = Infinity;
  let nearestName = '';
  
  for (const [id, info] of Object.entries(GULF_COAST_BUOYS)) {
    const distance = calculateDistance(beachLat, beachLon, info.lat, info.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestBuoy = id;
      nearestName = info.name;
    }
  }
  
  return {
    beachName: `${beachLat}, ${beachLon}`,
    nearestBuoy,
    distance: minDistance,
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch wave buoy data from NOAA
 * Uses NOAA's NDBC (National Data Buoy Center) API
 */
export async function fetchWaveBuoyData(stationId: string): Promise<WaveBuoyData | null> {
  try {
    // NOAA NDBC real-time data endpoint
    // Format: https://www.ndbc.noaa.gov/data/realtime2/{stationId}.txt
    const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch buoy data: ${response.statusText}`);
    }
    
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    if (lines.length < 2) {
      throw new Error('Invalid buoy data format');
    }
    
    // Parse header and data
    const header = lines[0].split(/\s+/);
    const dataLine = lines[1].split(/\s+/);
    
    // Find indices (format may vary)
    const getValue = (field: string): number => {
      const index = header.indexOf(field);
      return index >= 0 ? parseFloat(dataLine[index]) : 0;
    };
    
    // Parse date/time (usually in first few columns)
    const year = parseInt(dataLine[0]) || new Date().getFullYear();
    const month = parseInt(dataLine[1]) || new Date().getMonth() + 1;
    const day = parseInt(dataLine[2]) || new Date().getDate();
    const hour = parseInt(dataLine[3]) || 0;
    const minute = parseInt(dataLine[4]) || 0;
    
    const timestamp = new Date(year, month - 1, day, hour, minute);
    
    const buoyInfo = GULF_COAST_BUOYS[stationId];
    
    return {
      stationId,
      stationName: buoyInfo?.name || `Buoy ${stationId}`,
      location: {
        latitude: buoyInfo?.lat || 0,
        longitude: buoyInfo?.lon || 0,
      },
      timestamp,
      waveHeight: getValue('WVHT') || getValue('WAVE') || 0,
      wavePeriod: getValue('DPD') || getValue('PERIOD') || 0,
      waveDirection: getValue('MWD') || getValue('DIR') || 0,
      windSpeed: getValue('WSPD') || getValue('WIND') || 0,
      windDirection: getValue('WDIR') || 0,
      waterTemperature: getValue('WTMP') || getValue('TEMP') || 0,
      airTemperature: getValue('ATMP') || 0,
      pressure: getValue('PRES') || 0,
    };
  } catch (error) {
    console.error(`Error fetching buoy data for ${stationId}:`, error);
    return null;
  }
}

/**
 * Enhance beach safety prediction with real-time buoy data
 */
export function enhanceBeachSafetyWithBuoyData(
  basePrediction: {
    ripCurrentRisk: number;
    overallRisk: 'low' | 'moderate' | 'high' | 'extreme';
  },
  buoyData: WaveBuoyData
): {
  enhancedPrediction: {
    ripCurrentRisk: number;
    overallRisk: 'low' | 'moderate' | 'high' | 'extreme';
  };
  adjustments: Array<{ factor: string; impact: number; description: string }>;
} {
  let ripCurrentRisk = basePrediction.ripCurrentRisk;
  const adjustments: Array<{ factor: string; impact: number; description: string }> = [];
  
  // Wave height impact
  if (buoyData.waveHeight > 2.0) {
    const impact = (buoyData.waveHeight - 2.0) * 0.1;
    ripCurrentRisk += impact;
    adjustments.push({
      factor: 'Wave Height',
      impact,
      description: `High waves (${buoyData.waveHeight.toFixed(1)}m) increase rip current risk`,
    });
  }
  
  // Wave period impact (longer period = more dangerous)
  if (buoyData.wavePeriod > 10) {
    const impact = (buoyData.wavePeriod - 10) * 0.02;
    ripCurrentRisk += impact;
    adjustments.push({
      factor: 'Wave Period',
      impact,
      description: `Long wave period (${buoyData.wavePeriod.toFixed(1)}s) increases risk`,
    });
  }
  
  // Wind speed impact
  if (buoyData.windSpeed > 15) {
    const impact = (buoyData.windSpeed - 15) * 0.01;
    ripCurrentRisk += impact;
    adjustments.push({
      factor: 'Wind Speed',
      impact,
      description: `Strong winds (${buoyData.windSpeed.toFixed(1)} m/s) increase risk`,
    });
  }
  
  // Wind direction impact (onshore winds increase risk)
  const isOnshore = buoyData.windDirection > 180 && buoyData.windDirection < 360;
  if (isOnshore && buoyData.windSpeed > 10) {
    const impact = 0.1;
    ripCurrentRisk += impact;
    adjustments.push({
      factor: 'Wind Direction',
      impact,
      description: 'Onshore winds increase rip current formation',
    });
  }
  
  // Clamp risk
  ripCurrentRisk = Math.max(0, Math.min(1, ripCurrentRisk));
  
  // Determine overall risk level
  let overallRisk: 'low' | 'moderate' | 'high' | 'extreme';
  if (ripCurrentRisk < 0.3) {
    overallRisk = 'low';
  } else if (ripCurrentRisk < 0.5) {
    overallRisk = 'moderate';
  } else if (ripCurrentRisk < 0.7) {
    overallRisk = 'high';
  } else {
    overallRisk = 'extreme';
  }
  
  return {
    enhancedPrediction: {
      ripCurrentRisk,
      overallRisk,
    },
    adjustments,
  };
}

/**
 * Get buoy data for a specific beach
 */
export async function getBeachBuoyData(
  beachLat: number,
  beachLon: number
): Promise<{ buoyData: WaveBuoyData | null; mapping: BeachBuoyMapping }> {
  const mapping = findNearestBuoy(beachLat, beachLon);
  const buoyData = await fetchWaveBuoyData(mapping.nearestBuoy);
  
  return {
    buoyData,
    mapping,
  };
}

