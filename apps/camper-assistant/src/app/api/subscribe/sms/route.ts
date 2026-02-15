import { NextRequest, NextResponse } from 'next/server';

const SINCH_API_TOKEN = process.env.SINCH_API_TOKEN;
const SINCH_SERVICE_PLAN_ID = process.env.SINCH_SERVICE_PLAN_ID;
const SINCH_FROM_NUMBER = process.env.SINCH_FROM_NUMBER || 'WildReady';

export async function POST(request: NextRequest) {
  try {
    const { phone, name = '' } = await request.json();

    // Validate phone number (basic US format check)
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Valid 10-digit US phone number required' },
        { status: 400 }
      );
    }

    // Format with +1 for US
    const formattedPhone = `+1${cleanedPhone}`;

    // Send welcome SMS via Sinch
    const message = `Welcome to WildReady${name ? ', ' + name : ''}! 🏕️\n\nYou'll get camping tips, weather alerts & gear recommendations.\n\nReply STOP to unsubscribe.`;

    const response = await fetch(
      `https://us.sms.api.sinch.com/xms/v1/${SINCH_SERVICE_PLAN_ID}/batches`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SINCH_API_TOKEN}`,
        },
        body: JSON.stringify({
          from: SINCH_FROM_NUMBER,
          to: [formattedPhone],
          body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Sinch SMS error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      );
    }

    const data = await response.json();

    // TODO: Store phone number in database
    console.log('📱 SMS subscription:', formattedPhone);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! Check your phone.',
      batchId: data.id,
    });
  } catch (err) {
    console.error('SMS subscribe error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
