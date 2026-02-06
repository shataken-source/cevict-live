/**
 * Payment Cancel Page
 * 
 * Route: /payment-cancel
 * Displays message when user cancels Stripe checkout
 */

import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { XCircle, ArrowLeft, HelpCircle, CreditCard } from 'lucide-react';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <Layout session={null}>
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-yellow-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
          <p className="text-gray-600">
            Your payment was not processed. No charges were made to your account.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What Happened?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              You chose to cancel the payment process. Your booking has not been confirmed, and no payment was processed.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> If you were trying to complete a booking, you'll need to start the booking process again.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold mb-1">Payment Issues?</p>
              <p className="text-sm text-gray-600">
                If you experienced a payment error, please try again or contact support.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Questions About Your Booking?</p>
              <p className="text-sm text-gray-600">
                Our support team is here to help. Contact us if you have any questions.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/captains" className="flex-1">
            <Button className="w-full">
              <CreditCard className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </Link>
          <Link href="/bookings" className="flex-1">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
