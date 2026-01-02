import { NextRequest, NextResponse } from 'next/server';
import SMSService from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const { to, body, priority, scheduledFor } = await request.json();

    if (!to || !body) {
      return NextResponse.json(
        { error: 'Phone number and message body are required' },
        { status: 400 }
      );
    }

    const smsService = SMSService.getInstance();
    
    // Validate phone number
    if (!smsService.validatePhoneNumber(to)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Format phone number
    const formattedPhone = smsService.formatPhoneNumber(to);

    const response = await smsService.sendSMS({
      to: formattedPhone,
      body,
      priority: priority || 'normal',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
