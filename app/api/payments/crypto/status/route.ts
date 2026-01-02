import CryptoPaymentService from '@/lib/crypto-payment';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET: Check crypto payment status
 * Query param: chargeId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chargeId = searchParams.get('chargeId');

    if (!chargeId) {
      return NextResponse.json(
        { error: 'chargeId is required' },
        { status: 400 }
      );
    }

    const cryptoService = CryptoPaymentService.getInstance();
    const status = await cryptoService.getChargeStatus(chargeId);

    return NextResponse.json({
      success: true,
      status: {
        id: status.id,
        status: status.status,
        payment: status.payment,
      },
    });
  } catch (error: any) {
    console.error('Error getting crypto payment status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get payment status',
      },
      { status: 500 }
    );
  }
}

