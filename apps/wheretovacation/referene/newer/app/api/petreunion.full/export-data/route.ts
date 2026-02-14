import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Export pet data in JSON or CSV format
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const status = searchParams.get('status');
    const petType = searchParams.get('pet_type');
    const locationState = searchParams.get('location_state');

    // Build query
    let query = supabase.from('lost_pets').select('*');
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (petType && petType !== 'all') {
      query = query.eq('pet_type', petType);
    }
    if (locationState && locationState !== 'all') {
      query = query.eq('location_state', locationState);
    }

    const { data, error } = await query.limit(10000);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['id', 'pet_name', 'pet_type', 'breed', 'color', 'status', 'location_city', 'location_state', 'date_lost', 'created_at'];
      const csvRows = [
        headers.join(','),
        ...(data || []).map((row: any) =>
          headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];
      const csvContent = csvRows.join('\n');

      return NextResponse.json({
        success: true,
        content: csvContent,
        contentType: 'text/csv',
        filename: `petreunion-data-${new Date().toISOString().split('T')[0]}.csv`
      });
    } else {
      // JSON format
      return NextResponse.json({
        success: true,
        content: JSON.stringify(data, null, 2),
        contentType: 'application/json',
        filename: `petreunion-data-${new Date().toISOString().split('T')[0]}.json`
      });
    }

  } catch (error: any) {
    console.error('[EXPORT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export data' },
      { status: 500 }
    );
  }
}

