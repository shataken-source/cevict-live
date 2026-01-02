'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was not completed
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-amber-800">
              No charges were made to your account. You can try again anytime.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Need help?</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Check your payment information</li>
              <li>• Contact your bank if needed</li>
              <li>• Try a different payment method</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/pricing" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Pricing
              </Button>
            </Link>
            
            <Link href="/" className="flex-1">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>

          <div className="text-xs text-slate-500 text-center pt-4">
            <p>Questions? Contact support@smokersrights.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
