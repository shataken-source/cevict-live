/**
 * API Route for Directory Places
 * 
 * Provides RESTful access to smoker-friendly places
 * Supports filtering, pagination, search, and geospatial queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const format = searchParams.get('format') || 'json';
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '0'); // miles
    
    // Build query
    let query = supabase
      .from('sr_directory_places')
      .select('*', { count: 'exact' })
      .eq('status', 'verified');
    
    // Apply filters
    if (state) {
      query = query.eq('state_code', state.toUpperCase());
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Geospatial query if coordinates provided
    if (lat && lng && radius) {
      // Convert radius to degrees (approximate)
      const radiusDegrees = radius / 69; // 69 miles per degree of latitude
      query = query
        .filter('coordinates', 'dwithin', `POINT(${lng} ${lat}),${radiusDegrees}`)
        .order('coordinates', { ascending: false });
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    // Execute query
    const { data, error, count } = await query.order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch places', details: error.message },
        { status: 500 }
      );
    }
    
    // Format response
    const response = {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        hasNext: page * limit < (count || 0),
        hasPrev: page > 1
      },
      filters: {
        state,
        category,
        search,
        location: lat && lng ? { lat, lng, radius } : null
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    // Handle different response formats
    if (format === 'xml') {
      const xml = generateXML(response);
      return new NextResponse(xml, {
        headers: { 'Content-Type': 'application/xml' }
      });
    }
    
    if (format === 'csv') {
      const csv = generateCSV(response.data);
      return new NextResponse(csv, {
        headers: { 'Content-Type': 'text/csv' }
      });
    }
    
    if (format === 'geojson') {
      const geojson = generateGeoJSON(response.data);
      return new NextResponse(JSON.stringify(geojson), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add CORS headers for external access
    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300' // 5 minutes cache
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate XML response
 */
function generateXML(data: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<places>
  <meta>
    <timestamp>${data.meta.timestamp}</timestamp>
    <version>${data.meta.version}</version>
    <total>${data.pagination.total}</total>
  </meta>
  ${data.data.map((place: any) => `
  <place>
    <id>${place.id}</id>
    <name>${escapeXML(place.name)}</name>
    <address>${escapeXML(place.address)}</address>
    <city>${escapeXML(place.city)}</city>
    <state_code>${place.state_code}</state_code>
    <category>${place.category}</category>
    ${place.description ? `<description>${escapeXML(place.description)}</description>` : ''}
    ${place.notes ? `<notes>${escapeXML(place.notes)}</notes>` : ''}
    ${place.website_url ? `<website>${place.website_url}</website>` : ''}
    ${place.phone ? `<phone>${place.phone}</phone>` : ''}
    <age_restriction>${place.age_restriction}</age_restriction>
    <amenities>${place.amenities.join(',')}</amenities>
    <coordinates>${place.coordinates ? `${place.coordinates.x},${place.coordinates.y}` : ''}</coordinates>
    <submitted_at>${place.submitted_at}</submitted_at>
  </place>`).join('')}
</places>`;
}

/**
 * Generate CSV response
 */
function generateCSV(data: any[]): string {
  const headers = [
    'id', 'name', 'address', 'city', 'state_code', 'category', 'description',
    'notes', 'website_url', 'phone', 'age_restriction', 'amenities', 'submitted_at'
  ];
  
  const csvRows = [
    headers.join(','),
    ...data.map(place => [
      place.id,
      `"${escapeCSV(place.name)}"`,
      `"${escapeCSV(place.address)}"`,
      `"${escapeCSV(place.city)}"`,
      place.state_code,
      place.category,
      `"${escapeCSV(place.description || '')}"`,
      `"${escapeCSV(place.notes || '')}"`,
      place.website_url || '',
      place.phone || '',
      place.age_restriction,
      `"${place.amenities.join(';')}"`,
      place.submitted_at
    ].join(','))
  ];
  
  return csvRows.join('\n');
}

/**
 * Generate GeoJSON response for mapping
 */
function generateGeoJSON(data: any[]): any {
  return {
    type: 'FeatureCollection',
    features: data
      .filter(place => place.coordinates)
      .map(place => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [place.coordinates.x, place.coordinates.y]
        },
        properties: {
          id: place.id,
          name: place.name,
          address: place.address,
          city: place.city,
          state_code: place.state_code,
          category: place.category,
          description: place.description,
          website_url: place.website_url,
          phone: place.phone,
          age_restriction: place.age_restriction,
          amenities: place.amenities
        }
      }))
  };
}

/**
 * Escape XML special characters
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape CSV special characters
 */
function escapeCSV(text: string): string {
  return text.replace(/"/g, '""');
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
