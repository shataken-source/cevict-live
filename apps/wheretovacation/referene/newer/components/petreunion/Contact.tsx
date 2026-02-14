'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, AlertTriangle, Send } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Lost Pet - Need Help',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    // Reset form
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: 'Lost Pet - Need Help',
      message: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-orange-500">
            <span>🐾</span>
            <span>PetReunion</span>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 to-teal-600 text-white py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
        <p className="text-xl md:text-2xl opacity-95">We're here to help 24/7. Reach out anytime.</p>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 -mt-8 relative z-10">
          
          {/* Emergency Banner */}
          <div className="lg:col-span-2 bg-red-50 border-l-4 border-red-600 p-8 rounded-xl mb-8">
            <h3 className="text-red-800 font-bold text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Lost Your Pet Right Now?
            </h3>
            <p className="text-red-700 text-lg font-semibold">
              Don't wait! Call us immediately: <a href="tel:1-800-PET-FIND" className="text-red-900 underline">1-800-PET-FIND</a>
            </p>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Send Us a Message</h2>
            <p className="text-gray-600 mb-8">Fill out the form and we'll get back to you within 24 hours</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="Lost Pet - Need Help">Lost Pet - Need Help</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="Partnership Inquiry">Partnership Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tell us how we can help..."
                  required
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors resize-vertical"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Direct Contact */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Phone className="w-6 h-6 text-green-600" />
                Direct Contact
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-semibold text-gray-900 mb-1">24/7 Hotline</div>
                  <div className="text-gray-700">
                    <a href="tel:1-800-PET-FIND" className="text-green-600 hover:text-green-700 font-semibold">
                      1-800-PET-FIND
                    </a>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-semibold text-gray-900 mb-1">Email Support</div>
                  <div className="text-gray-700">
                    <a href="mailto:help@petreunion.org" className="text-green-600 hover:text-green-700 font-semibold">
                      help@petreunion.org
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Headquarters */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-green-600" />
                Headquarters
              </h3>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1">Address</div>
                <div className="text-gray-700 leading-relaxed">
                  1234 Animal Rescue Way<br />
                  Birmingham, AL 35203
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Response Times</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Emergency Calls:</span>
                  <span className="font-semibold text-green-600">Immediate</span>
                </div>
                <div className="flex justify-between">
                  <span>Email Support:</span>
                  <span className="font-semibold text-green-600">Within 24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Partnership Inquiries:</span>
                  <span className="font-semibold text-green-600">Within 48 hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
