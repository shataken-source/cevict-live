// Promo Code Management API
// File: apps/prognostication/app/api/promo/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface PromoCode {
  code: string;
  discount: number; // percentage
  type: 'percent' | 'fixed' | 'trial';
  duration: number; // days
  maxUses: number;
  currentUses: number;
  active: boolean;
  expiresAt: string;
}

// Store in database in production
const PROMO_CODES: Record<string, PromoCode> = {
  'TRYITNOW': {
    code: 'TRYITNOW',
    discount: 100,
    type: 'percent',
    duration: 7,
    maxUses: 1000000,
    currentUses: 0,
    active: true,
    expiresAt: '2035-12-31',
  },
  'BEATTHELINE': {
    code: 'BEATTHELINE',
    discount: 100,
    type: 'trial',
    duration: 7,
    maxUses: 1000000,
    currentUses: 0,
    active: true,
    expiresAt: '2035-12-31',
  },
  'WINWEEK1': {
    code: 'WINWEEK1',
    discount: 100,
    type: 'trial',
    duration: 7,
    maxUses: 1000000,
    currentUses: 0,
    active: true,
    expiresAt: '2035-12-31',
  },
  'TRIAL5': {
    code: 'TRIAL5',
    discount: 97, // $1 for $29 plan
    type: 'percent',
    duration: 5,
    maxUses: 1000000,
    currentUses: 0,
    active: true,
    expiresAt: '2035-12-31',
  },
  'LAUNCH50': {
    code: 'LAUNCH50',
    discount: 50,
    type: 'percent',
    duration: 30,
    maxUses: 1000000,
    currentUses: 0,
    active: true,
    expiresAt: '2035-12-31',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    const promo = PROMO_CODES[code.toUpperCase()];

    if (!promo) {
      return NextResponse.json(
        { valid: false, error: 'Invalid promo code' },
        { status: 404 }
      );
    }

    if (!promo.active) {
      return NextResponse.json(
        { valid: false, error: 'Promo code has expired' },
        { status: 400 }
      );
    }

    if (promo.currentUses >= promo.maxUses) {
      return NextResponse.json(
        { valid: false, error: 'Promo code usage limit reached' },
        { status: 400 }
      );
    }

    const expirationDate = new Date(promo.expiresAt);
    if (expirationDate < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Promo code has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      promo: {
        code: promo.code,
        discount: promo.discount,
        type: promo.type,
        duration: promo.duration,
      }
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}
