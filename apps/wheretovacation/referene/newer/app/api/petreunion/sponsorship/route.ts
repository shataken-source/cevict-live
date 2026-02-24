import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/petreunion/sponsorship
 * 
 * Submit a sponsorship inquiry from a local Alabama business
 * 
 * Body: {
 *   businessName: string,
 *   contactName: string,
 *   email: string,
 *   phone?: string,
 *   city: string,
 *   message?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { businessName, contactName, email, phone, city, message } = body;

    // Validation
    if (!businessName || !contactName || !email || !city) {
      return NextResponse.json(
        { error: 'businessName, contactName, email, and city are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Store in database if available
    if (supabase) {
      try {
        await supabase
          .from('sponsorship_inquiries')
          .insert({
            business_name: businessName,
            contact_name: contactName,
            email: email.toLowerCase(),
            phone: phone || null,
            city,
            state: 'AL', // Alabama-focused
            message: message || null,
            status: 'pending',
            created_at: new Date().toISOString()
          });
      } catch (dbError) {
        console.warn('[Sponsorship] Database insert failed, continuing with email:', dbError);
      }
    }

    // Send notification email (if email service configured)
    try {
      const notificationEmail = process.env.PETREUNION_ADMIN_EMAIL || 'sponsors@petreunion.org';
      
      console.log(`[Sponsorship] New inquiry received:
        Business: ${businessName}
        Contact: ${contactName}
        Email: ${email}
        Phone: ${phone || 'N/A'}
        City: ${city}, AL
        Message: ${message || 'N/A'}
      `);

      // TODO: Integrate with Sinch/SendGrid/Resend for email notifications
      // For now, just log the inquiry

    } catch (emailError) {
      console.warn('[Sponsorship] Email notification failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your interest in becoming a PetReunion Community Hero! Our team will contact you within 24-48 hours.',
      data: {
        businessName,
        city,
        status: 'pending'
      }
    });

  } catch (error: any) {
    console.error('[Sponsorship] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit sponsorship inquiry' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/petreunion/sponsorship
 * 
 * Get list of current sponsors (for Community Heroes page)
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      // Return sample sponsors if no database
      return NextResponse.json({
        sponsors: [
          {
            name: 'Example Pet Store',
            city: 'Birmingham',
            tier: 'gold',
            logoUrl: null,
            since: '2024'
          }
        ],
        message: 'Sample data - database not configured'
      });
    }

    const { data: sponsors, error } = await supabase
      .from('sponsors')
      .select('id, business_name, city, tier, logo_url, website_url, since_date')
      .eq('is_active', true)
      .order('tier', { ascending: false });

    if (error) {
      console.error('[Sponsorship] Get sponsors error:', error);
    }

    return NextResponse.json({
      sponsors: sponsors?.map(s => ({
        name: s.business_name,
        city: s.city,
        tier: s.tier,
        logoUrl: s.logo_url,
        websiteUrl: s.website_url,
        since: new Date(s.since_date).getFullYear().toString()
      })) || [],
      count: sponsors?.length || 0
    });

  } catch (error: any) {
    console.error('[Sponsorship] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sponsors' },
      { status: 500 }
    );
  }
}

