import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * POST /api/alerts/email
 * Send an alert email. Uses Resend API if RESEND_API_KEY is set.
 * Body: { to: string, subject: string, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Require either Clerk auth or internal caller header
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const callerSecret = request.headers.get('x-internal-secret');
    const isInternal = internalSecret && callerSecret === internalSecret;

    if (!isInternal) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Email address and message are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'Website Monitor <onboarding@resend.dev>';

    if (apiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: subject || 'Website Monitor Alert',
          text: message,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Resend email error:', res.status, err);
        return NextResponse.json(
          { error: 'Email send failed', details: err },
          { status: 502 }
        );
      }
      const data = await res.json();
      return NextResponse.json({ success: true, id: data.id });
    }

    console.log('📧 Email Alert (no RESEND_API_KEY):', { to, subject, message });
    return NextResponse.json({
      success: true,
      message: 'Email logged (RESEND_API_KEY not set)',
      to,
      loggedMessage: message,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
