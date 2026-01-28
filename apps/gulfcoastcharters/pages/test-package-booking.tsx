/**
 * Test Package Booking Page
 * Simple page to test the package booking widget
 * Navigate to: /test-package-booking
 */

import { useState } from 'react';
import Head from 'next/head';
import PackageBookingWidget from '../src/components/PackageBookingWidget';

export default function TestPackageBookingPage() {
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <>
      <Head>
        <title>Test Package Booking | GCC</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">Test Package Booking</h1>
            <p className="text-gray-600">Test booking vacation rental + boat charter together</p>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg">
              ✅ {success}
            </div>
          )}

          <PackageBookingWidget
            onSuccess={(bookingId) => {
              setSuccess(`Package booking created successfully! ID: ${bookingId.substring(0, 8)}...`);
            }}
          />
        </div>
      </div>
    </>
  );
}
