/**
 * Test Script for Stripe Checkout Function
 * 
 * Tests the stripe-checkout Edge Function locally
 * Run: deno run --allow-net --allow-env test-stripe-checkout.ts
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'your-anon-key';

async function testStripeCheckout() {
  console.log('🧪 Testing Stripe Checkout Function\n');

  const testPayload = {
    bookingId: 'test-booking-123',
    amount: 100.00,
    customerEmail: 'test@example.com',
    customerName: 'Test Customer',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      bookingId: 'test-booking-123',
      captainId: 'test-captain-456',
    },
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(testPayload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Test PASSED');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Test FAILED');
      console.log('Status:', response.status);
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('❌ Test ERROR:', error);
  }
}

// Run test
testStripeCheckout();
