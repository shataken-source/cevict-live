import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - PetReunion',
  description: 'PetReunion Terms of Service - Rules and guidelines for using our platform.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6 text-gray-900">Terms of Service</h1>
          <p className="text-gray-600 mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using PetReunion.org ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              PetReunion is an AI-powered platform that helps reunite lost pets with their owners. Users can report lost or found pets, search our database, and connect with other users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">3. User Responsibilities</h2>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Provide accurate and truthful information</li>
              <li>Respect other users and maintain appropriate conduct</li>
              <li>Do not post false, misleading, or fraudulent information</li>
              <li>Do not use the Service for illegal purposes</li>
              <li>Protect your account credentials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">4. AI Matching Disclaimer</h2>
            <p className="text-gray-700 mb-4">
              Our AI matching system provides confidence scores and recommendations, but matches are not guaranteed to be accurate. Always verify matches independently before taking action. PetReunion is not responsible for incorrect matches or outcomes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">5. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              PetReunion is provided "as is" without warranties. We are not liable for any damages resulting from use of the Service, including but not limited to incorrect matches, data loss, or security breaches.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">6. Contact</h2>
            <p className="text-gray-700 mb-4">
              Questions about these Terms? Contact us at <a href="/contact" className="text-blue-600 hover:underline">Contact Page</a>
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
