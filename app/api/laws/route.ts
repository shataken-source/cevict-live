/**
 * API Route for Law Cards
 * 
 * Provides RESTful access to smoking and vaping laws
 * Supports filtering, pagination, and search
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const format = searchParams.get('format') || 'json';
    
    const client = supabase as NonNullable<typeof supabase>;

    // Build query
    let query = client
      .from('sr_law_cards')
      .select('*', { count: 'exact' })
      .eq('is_active', true);
    
    // Apply filters
    if (state) {
      query = query.eq('state_code', state.toUpperCase());
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`summary.ilike.%${search}%,details.ilike.%${search}%,tags.cs.{${search}}`);
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    // Execute query
    const { data, error, count } = await query.order('state_code, category');
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch laws', details: error.message },
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
        search
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
<laws>
  <meta>
    <timestamp>${data.meta.timestamp}</timestamp>
    <version>${data.meta.version}</version>
    <total>${data.pagination.total}</total>
  </meta>
  ${data.data.map((law: any) => `
  <law>
    <id>${law.id}</id>
    <state_code>${law.state_code}</state_code>
    <state_name>${law.state_name}</state_name>
    <category>${law.category}</category>
    <summary>${escapeXML(law.summary)}</summary>
    ${law.details ? `<details>${escapeXML(law.details)}</details>` : ''}
    <tags>${law.tags.join(',')}</tags>
    <source_urls>${law.source_urls.join(',')}</source_urls>
    <last_verified>${law.last_verified_at}</last_verified>
    <last_updated>${law.last_updated_at}</last_updated>
  </law>`).join('')}
</laws>`;
}

/**
 * Generate CSV response
 */
function generateCSV(data: any[]): string {
  const headers = [
    'id', 'state_code', 'state_name', 'category', 'summary', 'details',
    'tags', 'source_urls', 'last_verified_at', 'last_updated_at'
  ];
  
  const csvRows = [
    headers.join(','),
    ...data.map(law => [
      law.id,
      law.state_code,
      law.state_name,
      law.category,
      `"${escapeCSV(law.summary)}"`,
      `"${escapeCSV(law.details || '')}"`,
      `"${law.tags.join(';')}"`,
      `"${law.source_urls.join(';')}"`,
      law.last_verified_at,
      law.last_updated_at
    ].join(','))
  ];
  
  return csvRows.join('\n');
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
