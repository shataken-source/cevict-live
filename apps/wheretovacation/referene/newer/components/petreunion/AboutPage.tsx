'use client';

import Link from 'next/link';
import { Search, Camera, Bell, Map, Shield, Heart, Users, Award, Mail, Phone, MapPin } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-orange-500">
            <span>🐾</span>
            <span>PetReunion</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/petreunion/report" className="text-gray-700 hover:text-orange-500 font-medium transition-colors">
              Report Lost Pet
            </Link>
            <Link href="/petreunion/search" className="text-gray-700 hover:text-orange-500 font-medium transition-colors">
              Search Found Pets
            </Link>
            <Link href="/petreunion/about" className="text-gray-700 hover:text-orange-500 font-medium transition-colors">
              About
            </Link>
            <Link href="/petreunion/contact" className="text-gray-700 hover:text-orange-500 font-medium transition-colors">
              Contact
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 to-orange-400 text-white py-20 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">About PetReunion</h1>
          <p className="text-xl md:text-2xl opacity-95 leading-relaxed">
            Every Second Counts When Your Pet Goes Missing. We're here to help reunite families with their beloved pets, 100% free.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="stat">
              <span className="text-4xl font-bold block mb-2">125,847</span>
              <span className="text-blue-100">Pets Reunited</span>
            </div>
            <div className="stat">
              <span className="text-4xl font-bold block mb-2">18hrs</span>
              <span className="text-blue-100">Average Reunion Time</span>
            </div>
            <div className="stat">
              <span className="text-4xl font-bold block mb-2">89%</span>
              <span className="text-blue-100">Success Rate</span>
            </div>
            <div className="stat">
              <span className="text-4xl font-bold block mb-2">24/7</span>
              <span className="text-blue-100">Support Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Powerful Tools to Find Your Pet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all text-center">
              <Camera className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Image Matching</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload a photo and our advanced AI scans thousands of reports to find visual matches instantly. Revolutionary facial recognition technology for pets.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all text-center">
              <Search className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Search</h3>
              <p className="text-gray-600 leading-relaxed">
                Search by location, pet type, breed, color, and more. Filter results to find exactly what you're looking for in seconds.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all text-center">
              <Bell className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Alerts</h3>
              <p className="text-gray-600 leading-relaxed">
                Get real-time notifications when a pet matching your description is reported. Email, SMS, and push notifications available.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all text-center">
              <Map className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Location Mapping</h3>
              <p className="text-gray-600 leading-relaxed">
                See where pets were last seen on an interactive map. Track sightings and coordinate search efforts with the community.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all text-center">
              <Shield className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Shelter Network</h3>
              <p className="text-gray-600 leading-relaxed">
                Direct integration with local animal shelters. Your report is automatically shared with facilities in your area.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all text-center">
              <Heart className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600 leading-relaxed">
                Your contact info is protected and only used for reunification. No spam, no data selling, ever. Your privacy is our priority.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Report Immediately</h3>
              <p className="text-gray-600 leading-relaxed">
                Create a report in under 2 minutes. Upload a photo, add details, and set your search radius. No account needed.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">We Search & Alert</h3>
              <p className="text-gray-600 leading-relaxed">
                Our AI scans existing reports for matches. Your alert goes out to local shelters, vets, and community members automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Community Helps</h3>
              <p className="text-gray-600 leading-relaxed">
                Thousands of pet lovers in your area receive notifications. Share sightings, tips, and support through our platform.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Happy Reunion</h3>
              <p className="text-gray-600 leading-relaxed">
                When your pet is found, we connect you directly. Average reunion time is just 18 hours. Celebrate and share your story!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Recent Happy Reunions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all">
              <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-6xl">
                🐕
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Max - Golden Retriever</h3>
                <p className="text-green-600 font-semibold mb-3">✓ Reunited in 6 hours • Birmingham, AL</p>
                <p className="text-gray-600 italic leading-relaxed">
                  "I was devastated when Max escaped through the fence. Within 6 hours of posting on PetReunion, a neighbor 3 blocks away contacted me. He's home safe!"
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all">
              <div className="h-48 bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-6xl">
                🐈
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Luna - Tabby Cat</h3>
                <p className="text-green-600 font-semibold mb-3">✓ Reunited in 2 days • Atlanta, GA</p>
                <p className="text-gray-600 italic leading-relaxed">
                  "The AI image match found Luna at a shelter 5 miles away. I would never have checked there without this amazing tool. Thank you!"
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all">
              <div className="h-48 bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-6xl">
                🐕‍🦺
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Bella - Husky Mix</h3>
                <p className="text-green-600 font-semibold mb-3">✓ Reunited in 12 hours • Nashville, TN</p>
                <p className="text-gray-600 italic leading-relaxed">
                  "The instant alerts made all the difference. Someone spotted Bella within hours and contacted us through the platform. We're so grateful!"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-700 to-blue-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Don't Wait Another Minute</h2>
          <p className="text-xl opacity-95 mb-8">The first 24 hours are critical. Start your search now.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/petreunion/report"
              className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transform hover:-translate-y-1 transition-all shadow-lg"
            >
              Report Lost Pet Now
            </Link>
            <Link
              href="/petreunion/image-match"
              className="px-8 py-4 bg-white text-blue-700 font-bold rounded-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-lg"
            >
              Try Image Match
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full text-sm font-semibold">
              ✓ 100% Free Forever
            </span>
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full text-sm font-semibold">
              ✓ No Registration
            </span>
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full text-sm font-semibold">
              ✓ Privacy Protected
            </span>
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full text-sm font-semibold">
              ✓ 24/7 Support
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-6">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/petreunion/report" className="text-gray-300 hover:text-orange-500 transition-colors">
                    Report Lost Pet
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/search" className="text-gray-300 hover:text-orange-500 transition-colors">
                    Search Found Pets
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/image-match" className="text-gray-300 hover:text-orange-500 transition-colors">
                    AI Image Match
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/alerts" className="text-gray-300 hover:text-orange-500 transition-colors">
                    Set Up Alerts
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-6">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/petreunion/how-it-works" className="text-gray-300 hover:text-orange-500 transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/faq" className="text-gray-300 hover:text-orange-500 transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/tips" className="text-gray-300 hover:text-orange-500 transition-colors">
                    Lost Pet Tips
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/shelter" className="text-gray-300 hover:text-orange-500 transition-colors">
                    Shelter Login
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-6">About</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/petreunion/about" className="text-gray-300 hover:text-orange-500 transition-colors">
                    About PetReunion
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/team" className="text-gray-300 hover:text-orange-500 transition-colors">
                    Our Team
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/contact" className="text-gray-300 hover:text-orange-500 transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/petreunion/volunteer" className="text-gray-300 hover:text-orange-500 transition-colors">
                    Volunteer
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-6">Get Help</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  <span>help@petreunion.org</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  <span>1-800-PET-FIND</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>24/7 Support Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Nationwide Coverage</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 mb-4">
              © 2025 PetReunion. All rights reserved. •{' '}
              <Link href="/petreunion/privacy" className="hover:text-orange-500 transition-colors">
                Privacy Policy
              </Link>{' '}
              •{' '}
              <Link href="/petreunion/terms" className="hover:text-orange-500 transition-colors">
                Terms of Service
              </Link>
            </p>
            <p className="text-gray-400 text-sm mb-2">Free service • No registration required • 100% volunteer-powered</p>
            <p className="text-gray-400 text-sm">Made with ❤️ for lost pets everywhere</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
