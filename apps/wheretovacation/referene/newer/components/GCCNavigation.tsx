'use client';

import React from 'react';
import Link from 'next/link';
import { Anchor, Phone, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationInfo from '@/components/LocationInfo';

interface GCCNavigationProps {
  currentPage?: string;
}

export default function GCCNavigation({ currentPage = '' }: GCCNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    { name: 'Find Boats', href: '/boats', active: currentPage === 'boats' },
    { name: 'Captains', href: '/captains', active: currentPage === 'captains' },
    { name: 'Charters', href: '/charters', active: currentPage === 'charters' },
    { name: 'Weather', href: '/weather', active: currentPage === 'weather' },
    { name: 'Booking', href: '/booking', active: currentPage === 'booking' },
    { name: "What to Bring", href: '/what-to-bring', active: currentPage === 'what-to-bring' },
  ];

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link href="/gcc" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Anchor className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gulf Coast Charters</h1>
                  <p className="text-xs text-gray-500">Verified Fishing Adventures</p>
                </div>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={`/gcc${item.href}`}
                  className={`font-medium transition-colors ${
                    item.active
                      ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <LocationInfo variant="header" />
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <a href="tel:(251) 555-0123" className="hidden sm:flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
                <Phone className="w-4 h-4" />
                <span className="font-medium">(251) 555-0123</span>
              </a>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/gcc/booking">
                  Book Now
                </Link>
              </Button>
              
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-blue-600"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <nav className="flex flex-col space-y-3">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={`/gcc${item.href}`}
                    className={`font-medium transition-colors px-2 py-1 ${
                      item.active
                        ? 'text-blue-600 bg-blue-50 rounded'
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="pt-2 border-t border-gray-200">
                  <LocationInfo variant="header" />
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

// GCC Footer Component
export function GCCFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Anchor className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">Gulf Coast Charters</h3>
                <p className="text-gray-400 text-sm">Verified Fishing Adventures</p>
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Your trusted source for professional charter fishing experiences on the Gulf Coast.
            </p>
            <LocationInfo variant="footer" />
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/gcc/charters" className="hover:text-white transition-colors">Fishing Charters</Link></li>
              <li><Link href="/gcc/boats" className="hover:text-white transition-colors">Boat Rentals</Link></li>
              <li><Link href="/gcc/captains" className="hover:text-white transition-colors">Captain Directory</Link></li>
              <li><Link href="/gcc/booking" className="hover:text-white transition-colors">Online Booking</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/gcc/weather" className="hover:text-white transition-colors">Weather & Tides</Link></li>
              <li><Link href="/gcc/fishing-report" className="hover:text-white transition-colors">Fishing Reports</Link></li>
              <li><Link href="/gcc/seasonal-guide" className="hover:text-white transition-colors">Seasonal Guide</Link></li>
              <li><Link href="/gcc/what-to-bring" className="hover:text-white transition-colors">What to Bring</Link></li>
              <li><Link href="/gcc/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-gray-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>(251) 555-0123</span>
              </div>
              <div className="flex items-center gap-2">
                <Anchor className="w-4 h-4" />
                <span>Orange Beach, AL</span>
              </div>
              <div>
                <a href="mailto:info@gulfcoastcharters.com" className="hover:text-white transition-colors">
                  info@gulfcoastcharters.com
                </a>
              </div>
            </div>
            <div className="mt-4">
              <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full">
                <Link href="/gcc/booking">Book Now</Link>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Gulf Coast Charters. All rights reserved. | 
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link> | 
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
