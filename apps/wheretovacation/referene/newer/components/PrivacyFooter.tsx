/**
 * Privacy-Focused Footer Component for WhereToVacation
 * Emphasizes data protection and encryption
 */

import Link from 'next/link';
import { Shield, Lock, Eye, Heart } from 'lucide-react';

export default function PrivacyFooter() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-blue-900/30 to-gray-900 text-white py-16 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-600/20 backdrop-blur-md rounded-full p-2">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Where To Vacation</h3>
                <p className="text-xs text-blue-300">Your Privacy is Our Priority</p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed mb-6">
              Your premier destination for Gulf Coast vacation rentals and experiences. We use your information
              only to provide better service and never sell your data to third parties.
            </p>

            {/* Privacy Badge */}
            <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-300 mb-2">🔒 Enterprise-Level Encryption</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    All your personal information, including anniversaries, birthdays, and preferences,
                    is encrypted using <strong>AES-256-GCM</strong> encryption. Your data is protected
                    at rest and in transit. We never sell your information - it's used solely to
                    provide you with personalized service and reminders.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Promise */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-blue-300 mb-2">Your Privacy is of Utmost Importance to Us</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    We collect information like anniversaries and birthdays to help you celebrate special
                    occasions with perfect vacations. This information is <strong>never sold</strong> and
                    is used exclusively to:
                  </p>
                  <ul className="text-sm text-gray-300 mt-2 space-y-1 ml-4 list-disc">
                    <li>Send you helpful reminders about upcoming special dates</li>
                    <li>Suggest rebooking vacations for anniversaries</li>
                    <li>Personalize your experience with relevant recommendations</li>
                    <li>Improve our service to better serve you</li>
                  </ul>
                  <p className="text-sm text-gray-300 mt-3">
                    <strong>We do NOT:</strong> Sell your data, share it with third parties, or use it
                    for marketing purposes without your explicit consent.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4 text-blue-300 text-lg">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link href="/search" className="text-gray-300 hover:text-blue-400 transition">Search Rentals</Link></li>
              <li><Link href="/activities" className="text-gray-300 hover:text-blue-400 transition">Activities</Link></li>
              <li><Link href="/about" className="text-gray-300 hover:text-blue-400 transition">About Us</Link></li>
              <li><Link href="/faq" className="text-gray-300 hover:text-blue-400 transition">FAQ</Link></li>
            </ul>
          </div>

          {/* Privacy & Legal */}
          <div>
            <h4 className="font-bold mb-4 text-blue-300 text-lg">Privacy & Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-blue-400 transition flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-blue-400 transition">Terms of Service</Link>
              </li>
              <li>
                <Link href="/data-protection" className="text-gray-300 hover:text-blue-400 transition flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Data Protection
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-gray-300 hover:text-blue-400 transition">Cookie Policy</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700/50 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Lock className="w-4 h-4" />
              <span>All data encrypted with AES-256-GCM • Never sold to third parties</span>
            </div>
            <p className="text-gray-400 text-sm">&copy; 2025 Where To Vacation. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

