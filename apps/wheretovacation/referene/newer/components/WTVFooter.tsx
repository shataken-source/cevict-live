'use client';

import React from 'react';
import Link from 'next/link';
import { Anchor, Phone, Mail, MapPin } from 'lucide-react';

export default function WTVFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Anchor className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">WhereToVacation</h3>
                <p className="text-gray-400 text-sm">Your Gulf Coast Vacation Guide</p>
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Discover the best destinations, vacation rentals, and activities along the Gulf Coast. 
              Your complete travel planning resource.
            </p>
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Based in Albertville, AL</span>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Destinations</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/destination/gulf-coast" className="hover:text-white transition-colors">Gulf Coast</Link></li>
              <li><Link href="/destination/orange-beach-al" className="hover:text-white transition-colors">Orange Beach, AL</Link></li>
              <li><Link href="/destination/gulf-shores-al" className="hover:text-white transition-colors">Gulf Shores, AL</Link></li>
              <li><Link href="/destination/destin-fl" className="hover:text-white transition-colors">Destin, FL</Link></li>
              <li><Link href="/vacation-rental-checklist" className="hover:text-white transition-colors">Rental Checklist</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/vacation-rental-checklist" className="hover:text-white transition-colors">Vacation Checklist</Link></li>
              <li><Link href="/travel-guides" className="hover:text-white transition-colors">Travel Guides</Link></li>
              <li><Link href="/seasonal-guide" className="hover:text-white transition-colors">Seasonal Guide</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Connect</h4>
            <div className="space-y-2 text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@wheretovacation.com" className="hover:text-white transition-colors">
                  info@wheretovacation.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>Coming Soon</span>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href="/search" 
                className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                Find Your Vacation
              </Link>
            </div>
          </div>
        </div>
        
        {/* Legal Disclaimer Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-200">Disclaimer & Terms of Use</h4>
            <div className="text-sm text-gray-400 space-y-3">
              <p>
                <strong>WhereToVacation.com</strong> is a travel information and resource site. While we strive to provide accurate and up-to-date recommendations, travel conditions, pricing, and availability change rapidly.
              </p>
              
              <p>
                <strong>Third-Party Content:</strong> This site may contain links to external websites, booking platforms, or affiliate partners (such as VRBO, Airbnb, or Expedia). We do not own or operate these services and are not liable for any disputes, cancellations, or injuries arising from bookings made through third-party links.
              </p>
              
              <p>
                <strong>Accuracy of Information:</strong> All content is provided "as is" for informational purposes only. We make no guarantees regarding the current state of amenities, safety, or legal compliance of the destinations featured.
              </p>
              
              <p>
                <strong>Affiliate Disclosure:</strong> Some links on this site may be affiliate links, meaning we may earn a commission at no additional cost to you if you make a purchase.
              </p>
              
              <p>
                <strong>Limitation of Liability:</strong> To the fullest extent permitted by law, WhereToVacation.com and its owners shall not be liable for any direct or indirect damages resulting from your use of this website or the travel services mentioned herein.
              </p>
            </div>
          </div>
          
          <div className="text-center text-gray-400">
            <p className="mb-2">
              &copy; 2024 WhereToVacation.com. All rights reserved. | 
              <Link href="/privacy" className="hover:text-white transition-colors ml-1">Privacy Policy</Link> | 
              <Link href="/terms" className="hover:text-white transition-colors ml-1">Terms of Service</Link> | 
              <Link href="/disclaimer" className="hover:text-white transition-colors ml-1">Full Disclaimer</Link>
            </p>
            <p className="text-xs">
              Based in Albertville, Alabama | Serving Gulf Coast travelers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
