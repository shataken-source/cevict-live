'use client';

import { useState } from 'react';
import { HelpCircle, Search, Heart, Image as ImageIcon, Bell, MapPin, Shield, ChevronDown, ChevronUp, Mail, Phone } from '@/components/ui/icons';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      category: 'Getting Started',
      question: 'How do I report a lost pet?',
      answer: 'Click the "Report Lost Pet" button on the homepage or navigation menu. Fill out the form with your pet\'s details, upload a photo, and submit. No registration required! You\'ll receive a confirmation and can track your pet using the email or phone you provided.'
    },
    {
      category: 'Getting Started',
      question: 'Is PetReunion really free?',
      answer: 'Yes! PetReunion is 100% free forever. No hidden fees, no subscriptions, no credit card required. We believe reuniting pets with their families should never cost money.'
    },
    {
      category: 'Getting Started',
      question: 'Do I need to create an account?',
      answer: 'No! You can report a lost pet, search for pets, and use all features without creating an account. Just provide your email or phone number when reporting a pet so we can contact you with matches.'
    },
    {
      category: 'Searching',
      question: 'How do I search for a pet I found?',
      answer: 'Go to the "Search Lost Pets" page and use the search bar or filters. You can search by breed, color, location, or description. If you find a match, contact the owner using the information provided on their listing.'
    },
    {
      category: 'Searching',
      question: 'How does the automated search work?',
      answer: 'Once you report a lost pet, our system automatically scans animal shelters, Facebook groups, and other sources for potential matches. We use location, breed, color, and other details to find similar pets. You\'ll be notified when potential matches are found.'
    },
    {
      category: 'Searching',
      question: 'How often does PetReunion scan for matches?',
      answer: 'Our automated system runs continuous scans throughout the day. New shelter listings are typically checked within 24 hours. You can also manually request a scan from your pet dashboard.'
    },
    {
      category: 'My Pets',
      question: 'How do I check on my reported pet?',
      answer: 'Go to "My Pets" in the navigation menu and enter the email, phone number, or name you used when reporting. You\'ll see all your pets, their status, scan history, and any potential matches.'
    },
    {
      category: 'My Pets',
      question: 'Can I update my pet\'s information?',
      answer: 'Yes! From your "My Pets" dashboard, click on a pet to view details and update information. You can change the description, add new photos, update location, or mark the pet as found.'
    },
    {
      category: 'My Pets',
      question: 'How do I mark my pet as found?',
      answer: 'Access your pet from the "My Pets" dashboard and click "Mark as Found" or "Update Status". This will remove it from active searches but keep the record for your reference.'
    },
    {
      category: 'Matches & Alerts',
      question: 'What happens when a potential match is found?',
      answer: 'You\'ll receive a notification (via email if provided) with details about the potential match, including photos, location, and contact information. Review the match and reach out if it looks like your pet.'
    },
    {
      category: 'Matches & Alerts',
      question: 'How accurate are the matches?',
      answer: 'Our matching system uses breed, color, size, location, and date to find potential matches. While we strive for accuracy, not all matches will be your pet. Always verify by comparing photos and details before meeting.'
    },
    {
      category: 'Matches & Alerts',
      question: 'Can I use image matching to find my pet?',
      answer: 'Yes! Go to "Image Match" in the menu and upload a photo of a pet you found. Our AI will compare it against lost pet photos in the database to find potential matches.'
    },
    {
      category: 'Safety',
      question: 'Is it safe to meet someone to reunite a pet?',
      answer: 'Always prioritize safety! Meet in public, well-lit locations. Bring a friend if possible. Verify pet ownership through photos, vet records, or microchip before handing over a pet. Trust your instincts - if something feels wrong, involve animal control.'
    },
    {
      category: 'Safety',
      question: 'How do I verify someone is the real owner?',
      answer: 'Ask for multiple photos from different angles, veterinary records, adoption papers, or microchip registration. Ask specific questions only the true owner would know (unique markings, behaviors, favorite toys). Consider having a vet scan for a microchip.'
    },
    {
      category: 'Safety',
      question: 'What if I suspect fraud or a scam?',
      answer: 'Report suspicious activity immediately using our contact form. Do not hand over a pet if you have doubts. Contact local animal control or police for assistance. We take fraud seriously and will investigate all reports.'
    },
    {
      category: 'Technical',
      question: 'Why isn\'t my pet showing up in searches?',
      answer: 'It may take a few minutes for new listings to appear. Make sure you provided accurate information and uploaded a clear photo. Check that your listing wasn\'t accidentally marked as found. If issues persist, contact support.'
    },
    {
      category: 'Technical',
      question: 'Can I delete my pet listing?',
      answer: 'Yes! Access your pet from "My Pets" and select "Delete Listing". You can also request deletion by contacting us. Note that deletion is permanent and cannot be undone.'
    },
    {
      category: 'Technical',
      question: 'What photo formats are supported?',
      answer: 'We accept JPG, PNG, and WebP formats. Photos should be clear, well-lit, and show your pet\'s face and body. Maximum file size is 10MB. We recommend photos at least 800x600 pixels for best results.'
    },
    {
      category: 'Privacy',
      question: 'Is my contact information public?',
      answer: 'Yes, your contact information (email/phone) is displayed on your pet\'s public listing so people who find your pet can reach you. We never sell your information to third parties. See our Privacy Policy for details.'
    },
    {
      category: 'Privacy',
      question: 'Can I request deletion of my data?',
      answer: 'Yes! You have the right to request deletion of all your data at any time. Contact us at privacy@petreunion.com and we\'ll remove your information within 48 hours.'
    },
  ];

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const filteredFAQs = faqs.filter(faq => 
    searchQuery === '' || 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-full mb-4">
            <HelpCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-xl text-gray-600 mb-8">Find answers to common questions about PetReunion</p>
          
          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg"
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle>Report Lost Pet</CardTitle>
              <CardDescription>Start searching for your lost companion</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/petreunion/report">
                <Button className="w-full">Get Started</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Search Database</CardTitle>
              <CardDescription>Found a pet? Search for their owner</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/search">
                <Button className="w-full" variant="outline">Search Now</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Need personalized help?</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:help@petreunion.com">
                <Button className="w-full" variant="outline">Email Us</Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Categories */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          {categories.map((category) => {
            const categoryFAQs = filteredFAQs.filter(faq => faq.category === category);
            if (categoryFAQs.length === 0) return null;

            return (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  {category === 'Getting Started' && <Heart className="w-5 h-5 text-blue-600" />}
                  {category === 'Searching' && <Search className="w-5 h-5 text-purple-600" />}
                  {category === 'My Pets' && <MapPin className="w-5 h-5 text-green-600" />}
                  {category === 'Matches & Alerts' && <Bell className="w-5 h-5 text-orange-600" />}
                  {category === 'Safety' && <Shield className="w-5 h-5 text-red-600" />}
                  {category === 'Technical' && <HelpCircle className="w-5 h-5 text-gray-600" />}
                  {category === 'Privacy' && <Shield className="w-5 h-5 text-indigo-600" />}
                  {category}
                </h3>
                
                <div className="space-y-3">
                  {categoryFAQs.map((faq, index) => {
                    const globalIndex = faqs.indexOf(faq);
                    const isExpanded = expandedIndex === globalIndex;
                    
                    return (
                      <Card key={globalIndex} className="overflow-hidden">
                        <button
                          onClick={() => toggleExpand(globalIndex)}
                          className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <h4 className="font-semibold text-gray-900">{faq.question}</h4>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 text-gray-700">
                            {faq.answer}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Still Need Help */}
        <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Still Need Help?</h3>
              <p className="mb-6 text-blue-50">
                Can't find what you're looking for? Our support team is here to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="mailto:help@petreunion.com">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Support
                  </Button>
                </a>
                <a href="tel:1-800-PET-FIND">
                  <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Us
                  </Button>
                </a>
              </div>
              <p className="mt-4 text-sm text-blue-100">
                Response time: Usually within 24 hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <div className="mt-12 text-center space-x-4 text-sm text-gray-600">
          <Link href="/petreunion/privacy" className="hover:text-blue-600 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/petreunion/terms" className="hover:text-blue-600 transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/petreunion/disclaimer" className="hover:text-blue-600 transition-colors">
            Disclaimer
          </Link>
          <span>•</span>
          <Link href="/petreunion" className="hover:text-blue-600 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
