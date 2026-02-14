import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us - Where To Vacation',
  description: 'Get in touch with Where To Vacation.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
          <p className="text-gray-700 mb-4">
            Contact us at <a href="mailto:info@wheretovacation.com" className="text-blue-600 hover:underline">info@wheretovacation.com</a>
          </p>
          <div className="mt-8">
            <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

