'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, FileText, Building2, Menu, X, Bell, Image as ImageIcon } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

export default function PetReunionNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = useMemo(() => {
      const links = [
        { href: '/petreunion', label: 'Home', icon: Home },
        { href: '/petreunion/report', label: 'Report Lost Pet', icon: Heart },
        { href: '/petreunion/search', label: 'Search Lost Pets', icon: Search },
        { href: '/petreunion/find-my-pet', label: 'Find My Pet', icon: Heart },
        { href: '/petreunion/image-match', label: 'Image Match', icon: ImageIcon },
        { href: '/petreunion/alerts', label: 'New Pet Alerts', icon: Bell },
        { href: '/petreunion/shelter/login', label: 'Shelter Login', icon: Building2 },
      ];
    
    // Add admin links if on admin page
    if (pathname?.includes('/admin')) {
      links.push({ href: '/petreunion/admin/dashboard', label: 'Dashboard', icon: FileText });
      links.push({ href: '/petreunion/admin/populate', label: 'Populate DB', icon: FileText });
    }
    
    return links;
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/petreunion') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 border-b-2 border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/petreunion" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg group-hover:scale-105 transition-transform">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PetReunion
              </div>
              <div className="text-xs text-gray-500 -mt-1">FREE Lost Pet Recovery</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all
                      ${active
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'text-gray-700 hover:bg-blue-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

