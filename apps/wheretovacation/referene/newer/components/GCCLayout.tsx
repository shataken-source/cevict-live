'use client';

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  ChevronDown, 
  Search, 
  Bell, 
  User,
  Anchor,
  Fish,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Waves,
  Compass,
  Trophy,
  Heart,
  Star,
  Users
} from 'lucide-react';

import { TopBannerAd, HeaderBannerAd, SidebarAd, ContentAd, FooterAd } from './AdManager';

interface GCCLayoutProps {
  children: React.ReactNode;
  showAds?: boolean;
  userType?: 'guest' | 'member' | 'captain' | 'admin';
  userLocation?: string;
}

export default function GCCLayout({ 
  children, 
  showAds = true, 
  userType = 'guest',
  userLocation = 'general'
}: GCCLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    {
      name: 'Charters',
      href: '/charters',
      icon: Anchor,
      dropdown: [
        { name: 'Deep Sea Fishing', href: '/charters/deep-sea' },
        { name: 'Inshore Fishing', href: '/charters/inshore' },
        { name: 'Family Trips', href: '/charters/family' },
        { name: 'Corporate Events', href: '/charters/corporate' }
      ]
    },
    {
      name: 'Community',
      href: '/community',
      icon: Users,
      dropdown: [
        { name: 'Fishing Reports', href: '/community/reports' },
        { name: 'Leaderboard', href: '/community/leaderboard' },
        { name: 'Photo Gallery', href: '/community/gallery' },
        { name: 'Forums', href: '/community/forums' }
      ]
    },
    {
      name: 'Weather',
      href: '/weather',
      icon: Waves,
      dropdown: [
        { name: 'Marine Forecast', href: '/weather/marine' },
        { name: 'Buoy Data', href: '/weather/buoys' },
        { name: 'Tides & Currents', href: '/weather/tides' },
        { name: 'Weather Alerts', href: '/weather/alerts' }
      ]
    },
    {
      name: 'Locations',
      href: '/locations',
      icon: MapPin,
      dropdown: [
        { name: 'Orange Beach', href: '/locations/orange-beach' },
        { name: 'Gulf Shores', href: '/locations/gulf-shores' },
        { name: 'Perdido Key', href: '/locations/perdido-key' },
        { name: 'Fort Morgan', href: '/locations/fort-morgan' }
      ]
    },
    {
      name: 'Gear Shop',
      href: '/gear',
      icon: Compass,
      dropdown: [
        { name: 'Safety Equipment', href: '/gear/safety' },
        { name: 'Electronics', href: '/gear/electronics' },
        { name: 'Clothing', href: '/gear/clothing' },
        { name: 'Accessories', href: '/gear/accessories' }
      ]
    }
  ];

  const renderNavigation = () => (
    <nav className="hidden md:flex items-center space-x-1">
      {navigation.map((item) => (
        <div key={item.name} className="relative">
          <button
            className="gcc-nav-link flex items-center gap-1"
            onClick={() => setActiveDropdown(activeDropdown === item.name ? null : item.name)}
          >
            <item.icon className="w-4 h-4" />
            {item.name}
            {item.dropdown && <ChevronDown className="w-3 h-3" />}
          </button>
          
          {item.dropdown && activeDropdown === item.name && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              {item.dropdown.map((subItem) => (
                <a
                  key={subItem.name}
                  href={subItem.href}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  {subItem.name}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );

  const renderMobileMenu = () => (
    <div className={`md:hidden fixed inset-0 z-50 ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navigation.map((item) => (
            <div key={item.name}>
              <button className="w-full flex items-center gap-2 p-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                <item.icon className="w-4 h-4" />
                {item.name}
              </button>
              {item.dropdown && (
                <div className="ml-4 space-y-1">
                  {item.dropdown.map((subItem) => (
                    <a
                      key={subItem.name}
                      href={subItem.href}
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      {subItem.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Banner Ad */}
      {showAds && <TopBannerAd userType={userType} userLocation={userLocation} />}
      
      {/* Header */}
      <header className={`gcc-header ${isScrolled ? 'shadow-lg' : ''}`}>
        <div className="gcc-header-container">
          {/* Logo */}
          <a href="/" className="gcc-logo">
            <div className="gcc-logo-icon">
              <Anchor className="w-6 h-6" />
            </div>
            <span>Gulf Coast Charters</span>
          </a>

          {/* Desktop Navigation */}
          {renderNavigation()}

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Account */}
            <div className="relative">
              <button className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <User className="w-5 h-5" />
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Header Banner Ad */}
        {showAds && <HeaderBannerAd userType={userType} userLocation={userLocation} />}
      </header>

      {/* Mobile Menu */}
      {renderMobileMenu()}

      {/* Main Content */}
      <main className="flex-1">
        <div className="gcc-container-xl">
          <div className="flex gap-8">
            {/* Sidebar */}
            {showAds && (
              <aside className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-24 space-y-6">
                  {/* Sidebar Ad */}
                  <SidebarAd userType={userType} userLocation={userLocation} />
                  
                  {/* Quick Links */}
                  <div className="gcc-card">
                    <div className="gcc-card-header">
                      <h3 className="font-semibold text-gray-900">Quick Links</h3>
                    </div>
                    <div className="gcc-card-body space-y-3">
                      <a href="/weather" className="flex items-center gap-3 text-gray-700 hover:text-gray-900">
                        <Waves className="w-4 h-4" />
                        <span className="text-sm">Marine Forecast</span>
                      </a>
                      <a href="/community/reports" className="flex items-center gap-3 text-gray-700 hover:text-gray-900">
                        <Fish className="w-4 h-4" />
                        <span className="text-sm">Latest Catches</span>
                      </a>
                      <a href="/book" className="flex items-center gap-3 text-gray-700 hover:text-gray-900">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Book a Trip</span>
                      </a>
                      <a href="/gear/safety" className="flex items-center gap-3 text-gray-700 hover:text-gray-900">
                        <Compass className="w-4 h-4" />
                        <span className="text-sm">Safety Gear</span>
                      </a>
                    </div>
                  </div>

                  {/* Community Stats */}
                  <div className="gcc-card">
                    <div className="gcc-card-header">
                      <h3 className="font-semibold text-gray-900">Community</h3>
                    </div>
                    <div className="gcc-card-body space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Active Anglers</span>
                        <span className="font-semibold text-gray-900">1,247</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Catches Today</span>
                        <span className="font-semibold text-gray-900">89</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Weather Alerts</span>
                        <span className="font-semibold text-orange-600">2 Active</span>
                      </div>
                      <button className="w-full gcc-btn gcc-btn-ocean gcc-btn-sm">
                        Join Community
                      </button>
                    </div>
                  </div>

                  {/* Featured Gear */}
                  <div className="gcc-card">
                    <div className="gcc-card-header">
                      <h3 className="font-semibold text-gray-900">Featured Gear</h3>
                    </div>
                    <div className="gcc-card-body space-y-4">
                      <div className="flex gap-3">
                        <img src="/api/placeholder/60/60" alt="Gear" className="w-15 h-15 rounded-lg object-cover" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">Breakwater First Aid Kit</h4>
                          <p className="text-xs text-gray-600">USCG Compliant</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-gray-600">4.8 (234)</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <img src="/api/placeholder/60/60" alt="Gear" className="w-15 h-15 rounded-lg object-cover" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">Pelican Phone Pouch</h4>
                          <p className="text-xs text-gray-600">100% Waterproof</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-gray-600">4.6 (189)</span>
                          </div>
                        </div>
                      </div>
                      <a href="/gear" className="w-full gcc-btn gcc-btn-outline gcc-btn-sm">
                        View All Gear
                      </a>
                    </div>
                  </div>
                </div>
              </aside>
            )}

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {/* Content Ad */}
              {showAds && (
                <ContentAd userType={userType} userLocation={userLocation} />
              )}
              
              {/* Page Content */}
              <div className="py-8">
                {children}
              </div>

              {/* Another Content Ad */}
              {showAds && (
                <ContentAd userType={userType} userLocation={userLocation} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Ad */}
      {showAds && <FooterAd userType={userType} userLocation={userLocation} />}

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="gcc-container-xl py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Anchor className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">Gulf Coast Charters</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Your premier charter fishing community. Connect with experienced captains, 
                share your catches, and discover the best fishing spots on the Gulf Coast.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/charters" className="text-gray-400 hover:text-white transition-colors">Book a Charter</a></li>
                <li><a href="/community" className="text-gray-400 hover:text-white transition-colors">Join Community</a></li>
                <li><a href="/weather" className="text-gray-400 hover:text-white transition-colors">Marine Weather</a></li>
                <li><a href="/gear" className="text-gray-400 hover:text-white transition-colors">Gear Shop</a></li>
                <li><a href="/captains" className="text-gray-400 hover:text-white transition-colors">Become a Captain</a></li>
                <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              </ul>
            </div>

            {/* Locations */}
            <div>
              <h4 className="font-semibold mb-4">Gulf Coast Locations</h4>
              <ul className="space-y-2">
                <li><a href="/locations/orange-beach" className="text-gray-400 hover:text-white transition-colors">Orange Beach, AL</a></li>
                <li><a href="/locations/gulf-shores" className="text-gray-400 hover:text-white transition-colors">Gulf Shores, AL</a></li>
                <li><a href="/locations/perdido-key" className="text-gray-400 hover:text-white transition-colors">Perdido Key, FL</a></li>
                <li><a href="/locations/fort-morgan" className="text-gray-400 hover:text-white transition-colors">Fort Morgan, AL</a></li>
                <li><a href="/locations/dauphin-island" className="text-gray-400 hover:text-white transition-colors">Dauphin Island, AL</a></li>
                <li><a href="/locations/bayou-la-batre" className="text-gray-400 hover:text-white transition-colors">Bayou La Batre, AL</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">(251) 555-0123</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">info@gulfcoastcharters.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Orange Beach Marina, AL</span>
                </div>
              </div>
              
              <div className="mt-6">
                <h5 className="font-medium mb-2">Get Weather Alerts</h5>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  <button className="gcc-btn gcc-btn-primary gcc-btn-sm">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 text-sm">
                © 2024 Gulf Coast Charters. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </a>
                <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </a>
                <a href="/sitemap" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Sitemap
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-40">
        <Fish className="w-6 h-6" />
      </button>
    </div>
  );
}
