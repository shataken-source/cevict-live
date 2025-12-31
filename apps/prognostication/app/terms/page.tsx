import BannerPlaceholder from '@/components/BannerPlaceholder';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - Prognostication',
  description: 'Prognostication Terms of Service.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BannerPlaceholder position="header" adSlot="1234567903" />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
            <p className="text-gray-600 mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
            <p className="text-gray-700 mb-4">
              Prognostication provides sports picks for informational purposes only. Picks are not guarantees. Use responsibly.
            </p>
            <BannerPlaceholder position="in-content" adSlot="1234567904" className="my-8" />
            <div className="mt-8">
              <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
      <BannerPlaceholder position="footer" adSlot="1234567905" />
    </div>
  );
}

