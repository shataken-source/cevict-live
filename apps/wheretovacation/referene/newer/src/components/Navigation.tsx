'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Menu, X, User, Ship } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import UserAuth from './UserAuth';
import { NotificationBell } from './NotificationBell';


export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const { user, logout } = useUser();

  const navLinks = [
    { name: 'Charters', href: '#charters' },
    { name: 'Captains', href: '/captain-directory' },
    { name: 'Plan Trip', href: '/plan-trip' },
    { name: 'Community', href: '/community' },
    { name: 'Affiliate Program', href: '/affiliate-program' },
    { name: 'About', href: '/about' },
  ];



  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Ship className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Gulf Coast Charters</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map(link => (
                <a key={link.name} href={link.href} className="text-gray-700 hover:text-blue-600 font-medium transition">
                  {link.name}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <NotificationBell />
                  <Button variant="outline" onClick={() => window.location.href = '/customer-dashboard'}>
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button variant="ghost" onClick={logout}>Logout</Button>

                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setShowAuth(true)}>Login</Button>
                  <Button onClick={() => setShowAuth(true)}>Sign Up</Button>
                </>
              )}
            </div>

            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              {navLinks.map(link => (
                <a key={link.name} href={link.href} className="block py-2 text-gray-700 hover:text-blue-600">
                  {link.name}
                </a>
              ))}
              <div className="mt-4 space-y-2">
                {user ? (
                  <>
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = '/customer-dashboard'}>
                      Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={logout}>Logout</Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full" onClick={() => setShowAuth(true)}>Login</Button>
                    <Button className="w-full" onClick={() => setShowAuth(true)}>Sign Up</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {showAuth && <UserAuth onClose={() => setShowAuth(false)} />}
    </>
  );
}
