import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, name = '' } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    // Send welcome email via Resend
    const { data, error } = await resend.emails.send({
      from: 'WildReady <updates@wildready.app>',
      to: [email],
      subject: 'Welcome to WildReady! 🏕️',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Welcome to WildReady! 🏕️</h1>
          <p>Hi ${name || 'there'},</p>
          <p>Thanks for subscribing to WildReady updates! You'll receive:</p>
          <ul>
            <li>🎯 Camping tips & gear recommendations</li>
            <li>🗺️ New features and app updates</li>
            <li>🌤️ Weather alerts for your favorite spots</li>
            <li>🏕️ Exclusive outdoor adventure guides</li>
          </ul>
          <p>Happy camping!<br>The WildReady Team</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280;">
            You're receiving this because you signed up at wildready.app.<br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send welcome email' },
        { status: 500 }
      );
    }

    // TODO: Store email in database (Supabase, PlanetScale, etc.)
    console.log('📧 Email subscription:', email);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! Check your email.',
      emailId: data?.id,
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
