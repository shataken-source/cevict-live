import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us - Progno',
  description: 'Learn about Progno - Sports prediction and analytics platform.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6">About Progno</h1>
          <p className="text-gray-700 mb-4">
            Progno is an advanced sports prediction and analytics platform providing data-driven insights for sports enthusiasts.
          </p>
          <div className="mt-8">
            <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

