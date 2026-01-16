'use client';

import { FileText, Heart, Home, Search, Shield } from '@/components/ui/icons';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-500" />
              <h3 className="text-xl font-bold">PetReunion</h3>
            </div>
            <p className="text-gray-400 text-sm">
              FREE Lost Pet Recovery Service. 100% free, no registration required.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/petreunion" className="text-gray-400 hover:text-white flex items-center gap-2 transition">
                  <Home className="w-4 h-4" />
                  Home
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-gray-400 hover:text-white flex items-center gap-2 transition">
                  <Search className="w-4 h-4" />
                  Search Lost Pets
                </Link>
              </li>
              <li>
                <Link href="/petreunion/report" className="text-gray-400 hover:text-white flex items-center gap-2 transition">
                  <FileText className="w-4 h-4" />
                  Report Lost Pet
                </Link>
              </li>
              <li>
                <Link href="/petreunion/find-my-pet" className="text-gray-400 hover:text-white flex items-center gap-2 transition">
                  <FileText className="w-4 h-4" />
                  Find My Pet Report
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search" className="text-gray-400 hover:text-white transition">
                  Browse Database
                </Link>
              </li>
              <li>
                <Link href="/petreunion/image-match" className="text-gray-400 hover:text-white transition">
                  Image Match
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Get Help</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-400">
                Need help finding your pet?
              </li>
              <li>
                <Link href="/petreunion/report" className="text-pink-400 hover:text-pink-300 transition">
                  Report Your Lost Pet →
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-pink-400 hover:text-pink-300 transition">
                  Search Found Pets →
                </Link>
              </li>
              <li className="mt-4 pt-4 border-t border-gray-700">
                <Link href="/gofundme" className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition">
                  <Heart className="w-4 h-4" />
                  Support PetReunion
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} PetReunion. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>100% Free • No Registration Required</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

