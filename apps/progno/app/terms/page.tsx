import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - Progno',
  description: 'Progno Terms of Service.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
          <p className="text-gray-600 mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
          <p className="text-gray-700 mb-4">
            Progno provides sports predictions and analytics for informational purposes only. Predictions are not guarantees. Use responsibly and in accordance with local gambling laws.
          </p>
          <div className="mt-8">
            <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

