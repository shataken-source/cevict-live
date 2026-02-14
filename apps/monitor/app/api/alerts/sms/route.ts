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

    const servicePlanId = process.env.SINCH_SERVICE_PLAN_ID;
    const apiToken = process.env.SINCH_API_TOKEN;
    const fromNumber = process.env.SINCH_FROM_NUMBER;
    const region = (process.env.SINCH_REGION || 'us').toLowerCase();

    if (servicePlanId && apiToken && fromNumber) {
      const normalizedTo = phone.replace(/\D/g, '').length === 10 ? `+1${phone.replace(/\D/g, '')}` : phone.startsWith('+') ? phone : `+${phone}`;
      const baseUrl = region === 'eu' ? 'https://eu.sms.api.sinch.com' : region === 'au' ? 'https://au.sms.api.sinch.com' : region === 'br' ? 'https://br.sms.api.sinch.com' : region === 'ca' ? 'https://ca.sms.api.sinch.com' : 'https://us.sms.api.sinch.com';
      const url = `${baseUrl}/xms/v1/${servicePlanId}/batches`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromNumber,
          to: [normalizedTo],
          body: message,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Sinch SMS error:', res.status, err);
        return NextResponse.json(
          { error: 'SMS send failed', details: err },
          { status: 502 }
        );
      }
      const data = await res.json();
      return NextResponse.json({
        success: true,
        message: 'SMS sent successfully',
        id: data.id,
      });
    }

    console.log('📱 SMS Alert (no Sinch config):', { phone, message });
    return NextResponse.json({
      success: true,
      message: 'SMS logged (SINCH_SERVICE_PLAN_ID, SINCH_API_TOKEN, SINCH_FROM_NUMBER not set)',
      phone,
      loggedMessage: message,
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
