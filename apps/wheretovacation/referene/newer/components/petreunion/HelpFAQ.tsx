'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, AlertTriangle, FileText, Search as SearchIcon, Camera, Bell, Phone, Mail } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function HelpFAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFAQ, setActiveFAQ] = useState<string | null>(null);

  const gettingStartedFAQs: FAQItem[] = [
    {
      question: "How do I report a lost pet?",
      answer: "Reporting a lost pet is quick and easy:\n\n1. Click \"Report Lost Pet\" on our homepage\n2. Upload a clear photo of your pet\n3. Fill in pet details (name, breed, color, size)\n4. Add the location where they were last seen\n5. Provide your contact information\n6. Submit - your report goes live immediately!\n\nNo account or registration required. The entire process takes about 2 minutes."
    },
    {
      question: "Is PetReunion really free?",
      answer: "Yes! PetReunion is 100% free, forever. We believe reuniting pets with their families should never cost money. We're supported by donations and volunteers who share our mission.\n\nAll features are free including: reporting lost/found pets, AI image matching, search alerts, shelter coordination, and 24/7 support."
    },
    {
      question: "Do I need to create an account?",
      answer: "No! You can report a lost or found pet without creating an account. We'll give you a report ID that you can use to access and update your report anytime.\n\nHowever, creating a free account gives you extra features like: dashboard to manage multiple reports, saved searches, and automatic alert preferences."
    }
  ];

  const lostPetTipsFAQs: FAQItem[] = [
    {
      question: "What should I do immediately after my pet goes missing?",
      answer: "First 24 hours are critical!\n\nTake these steps immediately:\n1. Search your immediate area thoroughly (check hiding spots)\n2. Report to PetReunion and get your alert broadcast\n3. Call all local shelters and animal control\n4. Post on social media (Facebook, Nextdoor, Instagram)\n5. Create and hang flyers in the neighborhood\n6. Alert neighbors, mail carriers, delivery drivers\n7. Leave familiar items outside (bed, toys, your clothing)\n8. Check with local vets in case someone brought them in"
    },
    {
      question: "How far do lost pets typically travel?",
      answer: "Most lost pets stay close to home:\n\n• Cats: Usually within 1-5 houses of home. They often hide nearby in fear.\n• Small dogs: Typically within 1-2 blocks (0.5 miles)\n• Large dogs: Can travel 1-3 miles on average\n• Scared pets: May freeze and hide rather than come when called\n\nFocus your search on the immediate area first, expanding outward in circles."
    },
    {
      question: "What makes a good lost pet photo?",
      answer: "The best photos for finding your pet:\n\n• Clear, well-lit, and in focus\n• Shows their face clearly\n• Recent photo (within past 6 months)\n• Shows distinctive markings or features\n• Include photos with collar/tags if possible\n• Multiple angles if available\n\nAvoid: blurry photos, photos from far away, or photos with multiple pets where yours isn't clearly visible."
    }
  ];

  const technologyFAQs: FAQItem[] = [
    {
      question: "How does AI Image Match work?",
      answer: "Our AI-powered image matching uses advanced facial recognition technology specifically trained on pet features:\n\n• Analyzes unique facial features and markings\n• Identifies coat colors and patterns\n• Compares against thousands of reports in our database\n• Provides similarity scores (percentage match)\n• Works even if photos are taken from different angles\n\nSimply upload a photo and our AI will search for visual matches automatically."
    },
    {
      question: "How do the automatic alerts work?",
      answer: "When you report a lost pet, our system automatically:\n\n1. Notifies local animal shelters in your area\n2. Sends alerts to registered users nearby\n3. Runs AI matching against found pet reports\n4. Sends you email/SMS when potential matches are found\n5. Updates you on sightings or tips from the community\n\nYou control your alert preferences and can turn them on/off anytime."
    },
    {
      question: "Is my personal information private?",
      answer: "Yes, your privacy is protected.\n\nYour contact information is:\n\n• Never publicly displayed on the website\n• Only used for reunification purposes\n• Only shared with verified shelters with your permission\n• Never sold or shared with third parties\n• Encrypted and securely stored\n\nWhen someone finds a potential match, we facilitate contact without exposing your details."
    }
  ];

  const toggleFAQ = (question: string) => {
    setActiveFAQ(activeFAQ === question ? null : question);
  };

  const quickLinks = [
    {
      icon: <FileText className="w-12 h-12" />,
      title: "Report Lost Pet",
      description: "Step-by-step guide to reporting your lost pet",
      href: "/petreunion/report"
    },
    {
      icon: <SearchIcon className="w-12 h-12" />,
      title: "Search Found Pets",
      description: "How to effectively search our database",
      href: "/petreunion/search"
    },
    {
      icon: <Camera className="w-12 h-12" />,
      title: "Image Match",
      description: "Using our AI-powered image matching",
      href: "/petreunion/image-match"
    },
    {
      icon: <Bell className="w-12 h-12" />,
      title: "Alert System",
      description: "How email and SMS alerts work",
      href: "/petreunion/alerts"
    }
  ];

  const renderFAQSection = (title: string, subtitle: string, faqs: FAQItem[]) => (
    <div className="mb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 text-lg">{subtitle}</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-all ${
              activeFAQ === faq.question ? 'border-orange-500' : 'border-transparent'
            }`}
          >
            <button
              onClick={() => toggleFAQ(faq.question)}
              className="w-full px-6 py-5 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
            >
              <span className="font-semibold text-gray-900 text-lg">{faq.question}</span>
              <ChevronDown
                className={`w-6 h-6 text-orange-500 transition-transform ${
                  activeFAQ === faq.question ? 'rotate-180' : ''
                }`}
              />
            </button>
            
            <div
              className={`transition-all duration-300 ease-in-out ${
                activeFAQ === faq.question ? 'max-h-96' : 'max-h-0'
              } overflow-hidden`}
            >
              <div className="px-6 pb-5 text-gray-700 leading-relaxed whitespace-pre-line">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
      <section className="bg-gradient-to-br from-orange-500 to-orange-400 text-white py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">How Can We Help You?</h1>
        <p className="text-xl md:text-2xl opacity-95">Find answers to common questions and get the help you need</p>
      </section>

      {/* Search Box */}
      <div className="max-w-3xl mx-auto -mt-8 relative z-10 px-4">
        <div className="bg-white p-6 rounded-xl shadow-2xl flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg text-lg focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <button className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold rounded-lg hover:shadow-lg transition-all">
            🔍 Search
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Emergency Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-600 p-8 rounded-xl mb-12">
          <h3 className="text-yellow-800 font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Lost Your Pet Right Now?
          </h3>
          <p className="text-yellow-700 font-semibold mb-3">Take immediate action:</p>
          <div className="space-y-2 text-yellow-700">
            <p>1. <Link href="/petreunion/report" className="text-red-600 font-semibold hover:underline">Report your lost pet immediately</Link> (takes 2 minutes)</p>
            <p>2. Search your immediate area and call their name</p>
            <p>3. Call local shelters: <strong>1-800-PET-FIND</strong></p>
            <p>4. Post on social media with your pet's photo</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {quickLinks.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-2 transition-all border-2 border-transparent hover:border-orange-500 text-center group"
            >
              <div className="text-orange-500 mb-4 flex justify-center group-hover:scale-110 transition-transform">
                {link.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{link.title}</h3>
              <p className="text-gray-600">{link.description}</p>
            </Link>
          ))}
        </div>

        {/* FAQ Sections */}
        {renderFAQSection("Getting Started", "Everything you need to know to use PetReunion", gettingStartedFAQs)}
        {renderFAQSection("Lost Pet Tips", "Best practices for finding your lost pet", lostPetTipsFAQs)}
        {renderFAQSection("Technology & Features", "How our tools work to help you", technologyFAQs)}

        {/* Contact CTA */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-600 text-white p-12 rounded-2xl text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-xl opacity-95 mb-8">Our support team is here to help 24/7</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/petreunion/contact"
              className="px-8 py-4 bg-white text-blue-700 font-bold rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Contact Support
            </Link>
            <a
              href="tel:1-800-PET-FIND"
              className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:bg-opacity-10 transition-all flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Call 1-800-PET-FIND
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
