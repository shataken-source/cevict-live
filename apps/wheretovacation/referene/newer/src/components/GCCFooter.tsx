'use client';

import React from 'react';
import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function GCCFooter() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">Gulf Coast Charters</h3>
            <p className="text-gray-400 mb-4">
              Your premier fishing charter service in the Gulf Coast. 
              Experience the best fishing adventures with our expert captains.
            </p>
            <div className="flex space-x-4">
              <Facebook className="w-5 h-5 cursor-pointer hover:text-blue-400 transition-colors" />
              <Twitter className="w-5 h-5 cursor-pointer hover:text-blue-400 transition-colors" />
              <Instagram className="w-5 h-5 cursor-pointer hover:text-pink-400 transition-colors" />
              <Youtube className="w-5 h-5 cursor-pointer hover:text-red-400 transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/charters" className="text-gray-400 hover:text-white transition-colors">
                  Book a Charter
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/captains" className="text-gray-400 hover:text-white transition-colors">
                  Our Captains
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="text-gray-400 hover:text-white transition-colors">
                  Gallery
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/services/deep-sea" className="text-gray-400 hover:text-white transition-colors">
                  Deep Sea Fishing
                </Link>
              </li>
              <li>
                <Link href="/services/inshore" className="text-gray-400 hover:text-white transition-colors">
                  Inshore Fishing
                </Link>
              </li>
              <li>
                <Link href="/services/overnight" className="text-gray-400 hover:text-white transition-colors">
                  Overnight Trips
                </Link>
              </li>
              <li>
                <Link href="/services/corporate" className="text-gray-400 hover:text-white transition-colors">
                  Corporate Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400">1-800-GCC-FISH</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400">info@gulfcoastcharters.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400">Gulf Coast, TX</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Gulf Coast Charters. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </Link>
              <Link href="/cancellation" className="text-gray-400 hover:text-white text-sm transition-colors">
                Cancellation Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
