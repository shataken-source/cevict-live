/**
 * Terms of Service Page
 * 
 * Route: /terms
 * Terms of service and legal information
 */

import Layout from '../components/Layout';
import { Card, CardContent } from '../src/components/ui/card';
import { FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <FileText className="w-10 h-10" />
            Terms of Service
          </h1>
          <p className="text-gray-600">Last updated: January 19, 2026</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using Gulf Coast Charters' services, you accept and agree to be bound by 
                the terms and provision of this agreement. If you do not agree to abide by the above, please 
                do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Booking and Reservations</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                All bookings are subject to availability and confirmation. By making a booking, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Provide accurate and complete information</li>
                <li>Pay the full amount at the time of booking unless otherwise specified</li>
                <li>Arrive on time for your scheduled charter</li>
                <li>Follow all safety instructions provided by the captain</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Cancellation and Refund Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Cancellation policies vary by charter type and timing:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Cancellations made 48 hours or more before the scheduled charter: Full refund</li>
                <li>Cancellations made within 48 hours: 50% refund</li>
                <li>No-shows: No refund</li>
                <li>Weather-related cancellations: Full refund or reschedule at no additional cost</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Safety and Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                Participation in charter fishing activities involves inherent risks. By booking a charter, 
                you acknowledge these risks and agree that Gulf Coast Charters, its captains, and vessel 
                owners are not liable for any injuries, damages, or losses that may occur during your charter, 
                except in cases of gross negligence or willful misconduct.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Conduct and Behavior</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                All passengers are expected to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Follow all instructions from the captain and crew</li>
                <li>Respect other passengers and the vessel</li>
                <li>Consume alcohol responsibly if permitted</li>
                <li>Not engage in any illegal activities</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                Violation of these rules may result in immediate termination of the charter without refund.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Weather and Conditions</h2>
              <p className="text-gray-700 leading-relaxed">
                Charter operations are subject to weather and sea conditions. The captain has the final 
                authority to cancel or modify a charter for safety reasons. In such cases, you will receive 
                a full refund or the option to reschedule.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Payment Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                All payments must be made in full at the time of booking unless otherwise agreed. We accept 
                major credit cards and debit cards. Prices are subject to change without notice, but you 
                will be charged the price confirmed at the time of booking.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Modifications to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                Gulf Coast Charters reserves the right to modify these terms at any time. Continued use of 
                our services after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:legal@gulfcoastcharters.com" className="text-blue-600 hover:text-blue-700">
                  legal@gulfcoastcharters.com
                </a>
                {' '}or{' '}
                <a href="/contact" className="text-blue-600 hover:text-blue-700">
                  through our contact page
                </a>.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/privacy">
            <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Privacy Policy
            </button>
          </Link>
          <Link href="/contact">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Contact Us
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
