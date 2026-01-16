import { NextRequest, NextResponse } from 'next/server';

type CheckoutBody = {
  amount?: number | string;
  donorName?: string;
  donorEmail?: string;
  donorMessage?: string;
  label?: string;
};

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const body = (await request.json().catch(() => ({}))) as CheckoutBody;

    const amountNumber = typeof body.amount === 'string' ? Number(body.amount) : body.amount;
    const amount = Number.isFinite(amountNumber) ? Number(amountNumber) : NaN;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const amountInCents = Math.round(amount * 100);
    if (!Number.isFinite(amountInCents) || amountInCents < 100 || amountInCents > 5_000_000) {
      return NextResponse.json({ error: 'Amount must be between $1 and $50,000' }, { status: 400 });
    }

    if (!stripeSecretKey) {
      return NextResponse.json({ configured: false }, { status: 200 });
    }

    const originHeader = request.headers.get('origin');
    const vercelUrl = process.env.VERCEL_URL;

    const origin =
      originHeader ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (vercelUrl ? (vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`) : 'http://localhost:3007');

    const successUrl = `${origin.replace(/\/$/, '')}/donate?success=1`;
    const cancelUrl = `${origin.replace(/\/$/, '')}/donate?canceled=1`;

    const label = (body.label || 'PetReunion Donation').trim() || 'PetReunion Donation';

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);

    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][unit_amount]', String(amountInCents));
    params.set('line_items[0][price_data][product_data][name]', label);
    params.set('line_items[0][quantity]', '1');

    // Enable multiple payment methods (card enables Google Pay & Apple Pay automatically)
    params.set('payment_method_types[0]', 'card');
    params.set('payment_method_types[1]', 'link');

    if (body.donorEmail?.trim()) {
      params.set('customer_email', body.donorEmail.trim());
    }

    if (body.donorName?.trim()) {
      params.set('metadata[donor_name]', body.donorName.trim());
    }
    if (body.donorMessage?.trim()) {
      params.set('metadata[donor_message]', body.donorMessage.trim().slice(0, 500));
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const json = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
      const msg = json?.error?.message || 'Failed to create checkout session';
      return NextResponse.json({ configured: true, error: msg }, { status: 500 });
    }

    const url = json?.url;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ configured: true, error: 'Stripe checkout url missing' }, { status: 500 });
    }

    return NextResponse.json({ configured: true, url }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
