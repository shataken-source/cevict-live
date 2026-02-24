'use client';

import { useState } from 'react';
import { Bell, Building2, DollarSign, FileText, Gift, Heart, Handshake, Home, Image as ImageIcon, Mail, MapPin, Phone, Search, Star, Users, X } from 'lucide-react';
import Link from 'next/link';

export default function PetReunionFooter() {
  const currentYear = new Date().getFullYear();
  const [showSponsorForm, setShowSponsorForm] = useState(false);

  const quickLinks = [
    { href: '/petreunion', label: 'Home', icon: Home },
    { href: '/petreunion/report', label: 'Report Lost Pet', icon: Heart },
    { href: '/petreunion/search', label: 'Search Lost Pets', icon: Search },
    { href: '/petreunion/find-my-pet', label: 'Find My Pet', icon: Heart },
    { href: '/petreunion/image-match', label: 'Image Match', icon: ImageIcon },
    { href: '/petreunion/alerts', label: 'New Pet Alerts', icon: Bell },
  ];

  const resources = [
    { href: '/petreunion/shelter/login', label: 'Shelter Login', icon: Building2 },
    { href: '/petreunion/help', label: 'Help Center', icon: FileText },
    { href: '/petreunion/about', label: 'About Us', icon: FileText },
    { href: '/petreunion/contact', label: 'Contact', icon: Mail },
  ];

  return (
    <>
    <footer className="bg-linear-to-br from-gray-900 via-blue-900 to-gray-900 text-white mt-auto">
      {/* Donate Banner */}
      <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Heart className="w-6 h-6 text-pink-300 animate-pulse" />
                <h3 className="text-xl font-bold text-white">Donate to PetReunion</h3>
              </div>
              <p className="text-white/90 text-sm max-w-xl">
                PetReunion is a <strong>100% free community service</strong>. We rely entirely on individual 
                donations and company sponsorships to keep our AI search tools and global alerts running.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://gofundme.com/f/petreunion"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-700 font-bold rounded-lg hover:bg-pink-100 transition-colors shadow-lg"
              >
                <DollarSign className="w-5 h-5" />
                Donate Now
              </a>
              <button
                onClick={() => setShowSponsorForm(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30"
              >
                <Handshake className="w-5 h-5" />
                Become a Sponsor
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/petreunion" className="flex items-center gap-2 mb-4 group">
              <div className="bg-linear-to-br from-blue-500 to-purple-600 p-2 rounded-lg group-hover:scale-105 transition-transform">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  PetReunion
                </div>
                <div className="text-xs text-gray-400 -mt-1">FREE Lost Pet Recovery</div>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              We help reunite lost pets with their families. 100% free, no registration required.
            </p>
            <div className="flex flex-col gap-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>help@petreunion.org</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>1-800-PET-FIND</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Available nationwide</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Resources</h3>
            <ul className="space-y-2">
              {resources.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sponsors & Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Support Us
            </h3>
            <div className="space-y-3 text-sm text-gray-400">
              <p>
                Your support keeps PetReunion free for everyone.
              </p>
              <div className="space-y-2">
                <a
                  href="https://gofundme.com/f/petreunion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors"
                >
                  <Gift className="w-4 h-4" />
                  <span>Make a Donation</span>
                </a>
                <button
                  onClick={() => setShowSponsorForm(true)}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-left"
                >
                  <Handshake className="w-4 h-4" />
                  <span>Become a Sponsor</span>
                </button>
                <Link
                  href="/petreunion/community-heroes"
                  className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Community Heroes</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Contact & Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Get Help</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <p>
                If you've lost a pet, report it immediately. The sooner you report, the better your chances.
              </p>
              <div className="pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500">
                  © {currentYear} PetReunion. All rights reserved.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Free service • No registration required • 100% volunteer-powered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <Link href="/petreunion/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/petreunion/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/petreunion/disclaimer" className="hover:text-white transition-colors">
                Disclaimer
              </Link>
              <Link href="/petreunion/help" className="hover:text-white transition-colors">
                Help
              </Link>
              <button
                onClick={() => setShowSponsorForm(true)}
                className="hover:text-yellow-400 transition-colors"
              >
                Sponsorship
              </button>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs text-gray-600">
                Made with <Heart className="w-3 h-3 inline text-pink-500" /> for lost pets in Alabama &amp; beyond
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>

    {/* Sponsorship Modal */}
    {showSponsorForm && (
      <SponsorshipModal onClose={() => setShowSponsorForm(false)} />
    )}
    </>
  );
}

/**
 * Sponsorship Modal for Alabama businesses
 */
function SponsorshipModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Send to API
      await fetch('/api/petreunion/sponsorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Sponsorship form error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-3 rounded-full">
              <Handshake className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Become a Community Hero</h2>
              <p className="text-white/80 text-sm">Support PetReunion as a local sponsor</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h3>
              <p className="text-gray-600 mb-6">
                We&apos;ve received your sponsorship inquiry. Our team will contact you within 24-48 hours.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Alabama Community Heroes Program
                </h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Join local businesses supporting lost pet recovery in Alabama. Your logo will appear 
                  on our website, posters, and success stories. Together, we bring pets home.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your Business Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="City, AL"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="email@business.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (Optional)
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about your business and why you'd like to support PetReunion..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Submitting...' : 'Submit Sponsorship Inquiry'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

