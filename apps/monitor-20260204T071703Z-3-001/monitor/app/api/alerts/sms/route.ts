import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromNumber) {
      // Send via Twilio REST API (no SDK dependency)
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const form = new URLSearchParams({
        To: phone.replace(/\D/g, '').length === 10 ? `+1${phone.replace(/\D/g, '')}` : phone,
        From: fromNumber,
        Body: message,
      });
      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Twilio SMS error:', res.status, err);
        return NextResponse.json(
          { error: 'SMS send failed', details: err },
          { status: 502 }
        );
      }
      const data = await res.json();
      return NextResponse.json({
        success: true,
        message: 'SMS sent successfully',
        sid: data.sid,
      });
    }

    // No Twilio config: log only (dev-friendly)
    console.log('📱 SMS Alert (no Twilio config):', { phone, message });
    return NextResponse.json({
      success: true,
      message: 'SMS logged (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER not set)',
      phone,
      loggedMessage: message,
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

