/**
 * Compliance Logging API
 * 
 * Logs compliance events for audit trail
 * Required for legal and regulatory requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    const client = supabase as NonNullable<typeof supabase>;
    const { action, details } = await request.json();

    // Get user info from request
    const userAgent = request.headers.get('user-agent') || '';
    const clientIP = request.ip || 
                   request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || '';

    // Get current user (if authenticated)
    const { data: { user } } = await client.auth.getUser();

    // Log compliance event
    const { error } = await client
      .from('compliance_logs')
      .insert({
        user_id: user?.id || null,
        action,
        details,
        ip_address: clientIP,
        user_agent: userAgent
      });

    if (error) {
      console.error('Compliance logging error:', error);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Compliance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
