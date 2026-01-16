import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - PetReunion',
  description: 'PetReunion Privacy Policy - How we collect, use, and protect your data.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6 text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              PetReunion ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services at petreunion.org.
            </p>
            <p className="text-gray-700 mb-4">
              By using PetReunion, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Pet Information:</strong> Photos, descriptions, breed, color, size, and other identifying characteristics</li>
              <li><strong>Location Data:</strong> City, state, and approximate location (we use fuzzy geolocation to protect your privacy)</li>
              <li><strong>Contact Information:</strong> Name, phone number, email address (for reuniting pets)</li>
              <li><strong>Account Information:</strong> If you create an account, username and password</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Device Information:</strong> IP address, browser type, device type</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, search queries</li>
              <li><strong>Cookies:</strong> We use cookies to enhance your experience (see Cookie Policy below)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Pet Matching:</strong> To match lost and found pets using AI-powered algorithms</li>
              <li><strong>Communication:</strong> To connect pet owners with finders (with your consent)</li>
              <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our matching algorithms</li>
              <li><strong>Safety:</strong> To prevent fraud and ensure platform security</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your personal information. We may share information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>With Your Consent:</strong> When you explicitly agree to share information (e.g., connecting with a pet finder)</li>
              <li><strong>Service Providers:</strong> With trusted third parties who help us operate (e.g., cloud hosting, AI services)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Public Information:</strong> Pet photos and descriptions (without personal contact info) may be publicly visible to help reunite pets</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">5. Fuzzy Geolocation & Privacy Protection</h2>
            <p className="text-gray-700 mb-4">
              To protect your safety and privacy, we use <strong>fuzzy geolocation</strong> instead of precise GPS coordinates:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>We round coordinates to approximately 1km accuracy (not exact addresses)</li>
              <li>You can choose "city-only" mode for maximum privacy</li>
              <li>This prevents your home address from being exposed</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">6. Your Rights (GDPR/CCPA Compliance)</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate information</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from communications</li>
              <li><strong>Cookie Preferences:</strong> Manage cookie settings (see cookie banner)</li>
            </ul>
            <p className="text-gray-700 mb-4">
              To exercise these rights, contact us at: <a href="mailto:privacy@petreunion.org" className="text-blue-600 hover:underline">privacy@petreunion.org</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">7. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>HTTPS encryption for all data transmission</li>
              <li>Encrypted storage of sensitive information</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">8. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              PetReunion is not intended for children under 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">9. Changes to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of changes by posting the new policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">10. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <ul className="text-gray-700 mb-4 space-y-2">
              <li><strong>Email:</strong> <a href="mailto:privacy@petreunion.org" className="text-blue-600 hover:underline">privacy@petreunion.org</a></li>
              <li><strong>General Inquiries:</strong> <a href="/contact" className="text-blue-600 hover:underline">Contact Page</a></li>
            </ul>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
