import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us - Where To Vacation',
  description: 'Learn about Where To Vacation.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6">About Where To Vacation</h1>
          <p className="text-gray-700 mb-4">
            Where To Vacation helps you find the perfect vacation rentals and activities, powered by Finn, your AI concierge.
          </p>
          <div className="mt-8">
            <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

