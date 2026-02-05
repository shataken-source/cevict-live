/**
 * Public Geocoding API Endpoint
 * Uses OpenStreetMap Nominatim (FREE - No API key required!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { geocodeLocation, reverseGeocode } from '../../../public-apis-integration';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    // Reverse geocoding (coordinates -> address)
    if (lat && lon) {
      const result = await reverseGeocode(parseFloat(lat), parseFloat(lon));

      if (!result) {
        return NextResponse.json(
          { error: 'Reverse geocoding failed' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        location: result
      });
    }

    // Forward geocoding (address -> coordinates)
    if (location) {
      const result = await geocodeLocation(location);

      if (!result) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        location: result
      });
    }

    return NextResponse.json(
      { error: 'Either location or lat/lon required' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

