import { useState } from 'react';
import { Button } from './ui/button';
import { Menu, X, User, Ship, Anchor, Users, TrendingUp, ShoppingBag, MapPin, MessageCircle, Settings, Shield } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useI18n } from '@/contexts/I18nContext';
import UserAuth from './UserAuth';
import LanguageSwitcher from './LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function NavigationEnhanced() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const { user, logout } = useUser();

  const captainLinks = [
    { name: 'Captain Dashboard', href: '/mobile-captain-dashboard', icon: Anchor },
    { name: 'Apply as Captain', href: '/apply-captain', icon: Ship },
    { name: 'Captain Directory', href: '/captain-directory', icon: Users },
  ];

  const customerLinks = [
    { name: 'Find Charters', href: '/#charters', icon: Ship },
    { name: 'Marine Gear Shop', href: '/marine-gear-shop', icon: ShoppingBag },
    { name: 'Destinations', href: '/#destinations', icon: MapPin },
    { name: 'Community', href: '/community', icon: MessageCircle },
  ];

  const businessLinks = [
    { name: 'Affiliate Program', href: '/affiliate-program', icon: TrendingUp },
    { name: 'Affiliate Analytics', href: '/affiliate-analytics', icon: TrendingUp },
  ];

  const adminLinks = [
    { name: 'Admin Dashboard', href: '/admin-panel', icon: Shield },
    { name: 'Fraud Detection', href: '/admin/fraud-detection', icon: Shield },
    { name: 'Security', href: '/admin/security', icon: Shield },
  ];

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="flex items-center space-x-2">
              <Ship className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Gulf Coast Charters</span>
            </a>

            <div className="hidden md:flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">Charters</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {captainLinks.map(link => (
                    <DropdownMenuItem key={link.name} onClick={() => window.location.href = link.href}>
                      <link.icon className="w-4 h-4 mr-2" />
                      {link.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">Explore</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {customerLinks.map(link => (
                    <DropdownMenuItem key={link.name} onClick={() => window.location.href = link.href}>
                      <link.icon className="w-4 h-4 mr-2" />
                      {link.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">Business</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {businessLinks.map(link => (
                    <DropdownMenuItem key={link.name} onClick={() => window.location.href = link.href}>
                      <link.icon className="w-4 h-4 mr-2" />
                      {link.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <a href="/about" className="text-gray-700 hover:text-blue-600 font-medium">About</a>
            </div>

            <div className="hidden md:flex items-center space-x-2">
              <LanguageSwitcher />
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Shield className="w-4 h-4 mr-2" />
                          Admin
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {adminLinks.map(link => (
                          <DropdownMenuItem key={link.name} onClick={() => window.location.href = link.href}>
                            <link.icon className="w-4 h-4 mr-2" />
                            {link.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button variant="outline" onClick={() => window.location.href = user.role === 'captain' ? '/mobile-captain-dashboard' : '/customer-dashboard'}>
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
            <div className="md:hidden py-4 border-t space-y-4">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Charters</p>
                {captainLinks.map(link => (
                  <a key={link.name} href={link.href} className="block py-2 pl-4 text-gray-700 hover:text-blue-600">
                    {link.name}
                  </a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Explore</p>
                {customerLinks.map(link => (
                  <a key={link.name} href={link.href} className="block py-2 pl-4 text-gray-700 hover:text-blue-600">
                    {link.name}
                  </a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Business</p>
                {businessLinks.map(link => (
                  <a key={link.name} href={link.href} className="block py-2 pl-4 text-gray-700 hover:text-blue-600">
                    {link.name}
                  </a>
                ))}
              </div>
              <a href="/about" className="block py-2 text-gray-700 hover:text-blue-600">About</a>
              <div className="mt-4 space-y-2">
                {user ? (
                  <>
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = user.role === 'captain' ? '/mobile-captain-dashboard' : '/customer-dashboard'}>
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
