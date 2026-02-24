import { MapPin, Mail, Phone, Facebook, Instagram, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white text-2xl font-bold mb-4">WhereToVacation</h3>
            <p className="mb-4">Your gateway to unforgettable travel experiences around the world.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition"><Facebook className="w-6 h-6" /></a>
              <a href="#" className="hover:text-white transition"><Instagram className="w-6 h-6" /></a>
              <a href="#" className="hover:text-white transition"><Twitter className="w-6 h-6" /></a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Destinations</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">Beach Resorts</a></li>
              <li><a href="#" className="hover:text-white transition">Mountain Retreats</a></li>
              <li><a href="#" className="hover:text-white transition">City Escapes</a></li>
              <li><a href="#" className="hover:text-white transition">Cultural Tours</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">About Us</a></li>
              <li><a href="#" className="hover:text-white transition">Contact</a></li>
              <li><a href="#" className="hover:text-white transition">Careers</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2"><MapPin className="w-5 h-5" /> 123 Travel St, NY 10001</li>
              <li className="flex items-center gap-2"><Mail className="w-5 h-5" /> info@wheretovacation.com</li>
              <li className="flex items-center gap-2"><Phone className="w-5 h-5" /> +1 (555) 123-4567</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center">
          <p>&copy; 2025 WhereToVacation. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
