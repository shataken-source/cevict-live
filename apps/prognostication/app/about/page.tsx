import BannerPlaceholder from '@/components/BannerPlaceholder';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us - Prognostication',
  description: 'Learn about Prognostication - Sports picks and predictions.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BannerPlaceholder position="header" adSlot="1234567894" />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-4xl font-bold mb-6">About Prognostication</h1>
            <p className="text-gray-700 mb-4">
              Prognostication provides expert sports picks and predictions powered by advanced analytics.
            </p>
            <BannerPlaceholder position="in-content" adSlot="1234567895" className="my-8" />
            <div className="mt-8">
              <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
      <BannerPlaceholder position="footer" adSlot="1234567896" />
    </div>
  );
}

