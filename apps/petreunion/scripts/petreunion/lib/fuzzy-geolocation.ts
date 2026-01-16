/**
 * Fuzzy Geolocation Utilities
 * 
 * Addresses Privacy Guardrails audit finding:
 * "Lacks 'Fuzzy Geolocation' options where a general vicinity is shown
 * instead of a precise GPS pin, which is the gold standard for user safety"
 */

export interface FuzzyLocation {
  // Rounded coordinates (reduces precision to ~1km)
  latitude: number;
  longitude: number;
  
  // General area description (e.g., "Downtown Mobile, AL")
  area: string;
  
  // Radius in meters (for display)
  radius: number;
  
  // Privacy level
  privacyLevel: 'precise' | 'fuzzy' | 'city_only';
}

/**
 * Convert precise GPS coordinates to fuzzy location
 * Rounds to ~1km accuracy to protect user privacy
 */
export function fuzzifyLocation(
  lat: number,
  lon: number,
  privacyLevel: 'precise' | 'fuzzy' | 'city_only' = 'fuzzy'
): FuzzyLocation {
  let fuzzyLat: number;
  let fuzzyLon: number;
  let radius: number;

  switch (privacyLevel) {
    case 'precise':
      // Keep original (only for verified shelters/authorities)
      fuzzyLat = lat;
      fuzzyLon = lon;
      radius = 50; // 50 meters
      break;
    
    case 'fuzzy':
      // Round to ~1km accuracy (default for user safety)
      fuzzyLat = Math.round(lat * 10) / 10;
      fuzzyLon = Math.round(lon * 10) / 10;
      radius = 1000; // 1km radius
      break;
    
    case 'city_only':
      // Round to ~10km accuracy (maximum privacy)
      fuzzyLat = Math.round(lat);
      fuzzyLon = Math.round(lon);
      radius = 10000; // 10km radius
      break;
  }

  // Reverse geocode to get area name (would use Google Maps API in production)
  const area = reverseGeocode(fuzzyLat, fuzzyLon);

  return {
    latitude: fuzzyLat,
    longitude: fuzzyLon,
    area,
    radius,
    privacyLevel,
  };
}

/**
 * Reverse geocode coordinates to area name
 * In production, use Google Maps Geocoding API
 */
function reverseGeocode(lat: number, lon: number): string {
  // Mock implementation - in production, call Google Maps API
  // For now, return approximate area based on coordinates
  return `Area near ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

/**
 * Calculate distance between two fuzzy locations
 */
export function calculateDistance(
  loc1: FuzzyLocation,
  loc2: FuzzyLocation
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if two fuzzy locations overlap (within radius)
 */
export function locationsOverlap(
  loc1: FuzzyLocation,
  loc2: FuzzyLocation
): boolean {
  const distance = calculateDistance(loc1, loc2);
  return distance <= (loc1.radius + loc2.radius);
}

