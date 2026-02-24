'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, MapPin, Phone, Search, User, Heart, Anchor } from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
  icon?: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Destinations',
    href: '/destinations',
    children: [
      { label: 'Gulf Coast', href: '/destinations/gulf-coast' },
      { label: 'Alabama', href: '/destinations/alabama' },
      { label: 'Florida', href: '/destinations/florida' },
      { label: 'Texas', href: '/destinations/texas' },
      { label: 'Louisiana', href: '/destinations/louisiana' },
      { label: 'Mississippi', href: '/destinations/mississippi' }
    ]
  },
  {
    label: 'Activities',
    href: '/activities',
    children: [
      { label: 'Beach & Relaxation', href: '/activities/beach' },
      { label: 'Fishing', href: '/activities/fishing' },
      { label: 'Water Sports', href: '/activities/water-sports' },
      { label: 'Family Fun', href: '/activities/family' },
      { label: 'Dining & Nightlife', href: '/activities/dining' },
      { label: 'Shopping', href: '/activities/shopping' }
    ]
  },
  {
    label: 'Travel Style',
    href: '/travel-style',
    children: [
      { label: 'Family Vacations', href: '/travel-style/family' },
      { label: 'Romantic Getaways', href: '/travel-style/romantic' },
      { label: 'Adventure Travel', href: '/travel-style/adventure' },
      { label: 'Budget-Friendly', href: '/travel-style/budget' },
      { label: 'Luxury Travel', href: '/travel-style/luxury' },
      { label: 'Solo Travel', href: '/travel-style/solo' }
    ]
  },
  {
    label: 'Planning',
    href: '/planning',
    children: [
      { label: 'Vacation Rental Checklist', href: '/vacation-rental-checklist' },
      { label: 'Trip Planner', href: '/planning/trip-planner' },
      { label: 'Seasonal Guide', href: '/planning/seasonal-guide' },
      { label: 'Packing Lists', href: '/planning/packing' },
      { label: 'Travel Tips', href: '/planning/tips' },
      { label: 'Budget Calculator', href: '/planning/budget' }
    ]
  },
  {
    label: 'Charters',
    href: '/charters',
    icon: <Anchor className="w-4 h-4" />
  }
];

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleDropdownToggle = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label);
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setActiveDropdown(null);
  };

  const handleMobileItemClick = () => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:block fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors">
              <Anchor className="w-8 h-8" />
              <span className="text-xl font-bold">WhereToVacation</span>
            </Link>

            {/* Main Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <div key={item.label} className="relative">
                  {item.children ? (
                    <button
                      onClick={() => handleDropdownToggle(item.label)}
                      className="flex items-center gap-1 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium"
                    >
                      {item.icon && <span>{item.icon}</span>}
                      {item.label}
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        activeDropdown === item.label ? 'rotate-180' : ''
                      }`} />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center gap-1 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium"
                    >
                      {item.icon && <span>{item.icon}</span>}
                      {item.label}
                    </Link>
                  )}

                  {/* Dropdown Menu */}
                  {item.children && activeDropdown === item.label && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <Heart className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <User className="w-5 h-5" />
              </button>
              <Link
                href="/search"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Start Planning
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className={`lg:hidden fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur'
      }`}>
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-blue-600">
              <Anchor className="w-6 h-6" />
              <span className="text-lg font-bold">WTV</span>
            </Link>

            {/* Mobile Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-600 hover:text-blue-600">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-blue-600">
                <Heart className="w-5 h-5" />
              </button>
              <button
                onClick={handleMobileMenuToggle}
                className="p-2 text-gray-600 hover:text-blue-600"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {navigationItems.map((item) => (
                <div key={item.label}>
                  {item.children ? (
                    <div>
                      <button
                        onClick={() => handleDropdownToggle(item.label)}
                        className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors text-base font-medium"
                      >
                        <div className="flex items-center gap-2">
                          {item.icon && <span>{item.icon}</span>}
                          {item.label}
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${
                          activeDropdown === item.label ? 'rotate-180' : ''
                        }`} />
                      </button>
                      
                      {activeDropdown === item.label && (
                        <div className="pl-4 pr-2 py-2 space-y-1 bg-gray-50">
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              onClick={handleMobileItemClick}
                              className="block px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={handleMobileItemClick}
                      className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors text-base font-medium"
                    >
                      {item.icon && <span>{item.icon}</span>}
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}

              {/* Mobile CTA */}
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href="/search"
                  onClick={handleMobileItemClick}
                  className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
                >
                  Start Planning
                </Link>
              </div>

              {/* Mobile Contact Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="px-4 py-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>(251) 555-0123</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>Gulf Coast, AL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={handleMobileMenuToggle}
        />
      )}

      {/* Spacer for fixed navigation */}
      <div className="lg:h-16 h-14" />
    </>
  );
}

// Bottom Navigation for Mobile (optional enhancement)
export function MobileBottomNav() {
  const [activeTab, setActiveTab] = useState('home');

  const bottomNavItems = [
    { id: 'home', label: 'Home', href: '/', icon: <Anchor className="w-5 h-5" /> },
    { id: 'search', label: 'Search', href: '/search', icon: <Search className="w-5 h-5" /> },
    { id: 'favorites', label: 'Saved', href: '/favorites', icon: <Heart className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', href: '/profile', icon: <User className="w-5 h-5" /> }
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around py-2">
        {bottomNavItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              activeTab === item.id
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
