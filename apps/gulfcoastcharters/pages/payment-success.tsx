/**
 * Payment Success Page
 * 
 * Route: /payment-success
 * Displays confirmation after successful Stripe payment
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { CheckCircle, Calendar, Mail, FileText, ArrowRight } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { session_id, booking, type: paymentType, tipId } = router.query;
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const isTip = paymentType === 'tip' && tipId;
  const isCustomEmail = paymentType === 'email';

  useEffect(() => {
    async function loadPaymentData() {
      try {
        setLoading(true);

        // Tip success: no need to fetch booking
        if (isTip) {
          setLoading(false);
          return;
        }

        // If booking ID provided, fetch booking details
        if (booking && typeof booking === 'string') {
          const { data: bookingInfo, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', booking)
            .single();

          if (!bookingError && bookingInfo) {
            setBookingData(bookingInfo);
          }
        }

        // If session ID provided, verify payment with Stripe
        if (session_id && typeof session_id === 'string') {
          // Verify payment via Edge Function
          const { data: paymentInfo, error: paymentError } = await supabase.functions.invoke('stripe-webhook', {
            body: {
              action: 'verify_session',
              session_id: session_id
            }
          });

          if (!paymentError && paymentInfo) {
            setPaymentData(paymentInfo);
          }
        }

        // Award points for booking completion (gamification)
        if (bookingData) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await supabase.functions.invoke('points-rewards-system', {
                body: {
                  action: 'award_points',
                  userId: session.user.id,
                  actionType: 'booking',
                  amount: 100,
                },
              });
              toast.success('Booking confirmed! +100 points');
            }
          } catch (pointsError) {
            console.error('Error awarding booking points:', pointsError);
            // Don't block success page if points fail
          }
        }

        // If no data found, still show success (payment may have been processed)
        if (!bookingData && !paymentData) {
          toast.info('Payment processed successfully');
        }
      } catch (error: any) {
        console.error('Error loading payment data:', error);
        // Don't show error - payment likely succeeded even if we can't fetch details
      } finally {
        setLoading(false);
      }
    }

    if (router.isReady) {
      loadPaymentData();
    }
  }, [router.isReady, session_id, booking, isTip, isCustomEmail]);

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-2xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const bookingDate = bookingData?.booking_date ? new Date(bookingData.booking_date) : null;

  if (isTip) {
    return (
      <Layout session={null}>
        <div className="max-w-2xl mx-auto p-4 sm:p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tip Sent!</h1>
            <p className="text-gray-600">
              Thank you for tipping your captain. They’ll receive it shortly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button className="w-full sm:w-auto">Go to Dashboard</Button>
            </Link>
            <Link href="/bookings">
              <Button variant="outline" className="w-full sm:w-auto">View Bookings</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isCustomEmail) {
    return (
      <Layout session={null}>
        <div className="max-w-2xl mx-auto p-4 sm:p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Custom Email Activated!</h1>
            <p className="text-gray-600">
              Your @gulfcoastcharters.com address is ready. You can set up forwarding in your dashboard.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button className="w-full sm:w-auto">Go to Dashboard</Button>
            </Link>
            <Link href="/captain-dashboard">
              <Button variant="outline" className="w-full sm:w-auto">Captain Dashboard</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout session={null}>
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">
            Your payment has been processed and your booking is confirmed.
          </p>
        </div>

        {bookingData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Booking Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Booking Date</p>
                  <p className="font-semibold">
                    {bookingDate ? bookingDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Not specified'}
                  </p>
                </div>
              </div>

              {bookingData.charter_name && (
                <div>
                  <p className="text-sm text-gray-600">Charter</p>
                  <p className="font-semibold">{bookingData.charter_name}</p>
                </div>
              )}

              {bookingData.guests && (
                <div>
                  <p className="text-sm text-gray-600">Guests</p>
                  <p className="font-semibold">{bookingData.guests} {bookingData.guests === 1 ? 'guest' : 'guests'}</p>
                </div>
              )}

              {bookingData.total_price && (
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${bookingData.total_price.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {bookingData.id && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">Booking ID</p>
                  <p className="font-mono text-sm">{bookingData.id}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold">Confirmation Email</p>
                <p className="text-sm text-gray-600">
                  A confirmation email has been sent to your email address with all booking details.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold">Booking Reminder</p>
                <p className="text-sm text-gray-600">
                  You'll receive a reminder 24 hours before your scheduled trip.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold">View Booking Details</p>
                <p className="text-sm text-gray-600">
                  You can view and manage your booking from your dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          {bookingData?.id && (
            <Link href={`/bookings/${bookingData.id}`} className="flex-1">
              <Button className="w-full">
                View Booking Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
          <Link href="/bookings" className="flex-1">
            <Button variant="outline" className="w-full">
              View All Bookings
            </Button>
          </Link>
          <Link href="/captains">
            <Button variant="outline" className="w-full sm:w-auto">
              Book Another Trip
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
