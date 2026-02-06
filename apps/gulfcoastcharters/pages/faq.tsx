/**
 * FAQ Page
 * 
 * Route: /faq
 * Frequently asked questions page
 */

import { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent } from '../src/components/ui/card';
import { Input } from '../src/components/ui/input';
import { 
  HelpCircle, Search, ChevronDown, ChevronUp, 
  MessageSquare, Mail 
} from 'lucide-react';
import Link from 'next/link';

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

const faqCategories = [
  { id: 'all', name: 'All Questions' },
  { id: 'booking', name: 'Booking' },
  { id: 'payment', name: 'Payment' },
  { id: 'cancellation', name: 'Cancellation' },
  { id: 'safety', name: 'Safety' },
  { id: 'general', name: 'General' },
];

const faqs: FAQItem[] = [
  {
    id: '1',
    question: 'How do I book a charter?',
    answer: 'You can book a charter by browsing our available captains and vessels, selecting your preferred date and time, and completing the booking form. You\'ll receive a confirmation email once your booking is confirmed.',
    category: 'booking',
  },
  {
    id: '2',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and debit cards through our secure payment processor. Payment is required at the time of booking.',
    category: 'payment',
  },
  {
    id: '3',
    question: 'What is your cancellation policy?',
    answer: 'Cancellations made 48 hours or more before your scheduled charter will receive a full refund. Cancellations made within 48 hours are subject to a 50% cancellation fee. Weather-related cancellations are fully refundable.',
    category: 'cancellation',
  },
  {
    id: '4',
    question: 'What should I bring on my charter?',
    answer: 'We recommend bringing sunscreen, a hat, sunglasses, appropriate clothing for the weather, a camera, and any personal items you may need. Fishing equipment is provided, but you\'re welcome to bring your own if preferred.',
    category: 'general',
  },
  {
    id: '5',
    question: 'Are your vessels safe?',
    answer: 'Yes, safety is our top priority. All our vessels meet or exceed Coast Guard safety standards and are regularly inspected. Our captains are certified and experienced, and all necessary safety equipment is on board.',
    category: 'safety',
  },
  {
    id: '6',
    question: 'Can I modify my booking?',
    answer: 'Yes, you can modify your booking through your account dashboard or by contacting our support team. Changes are subject to availability and may incur additional fees depending on the modification.',
    category: 'booking',
  },
  {
    id: '7',
    question: 'What happens if the weather is bad?',
    answer: 'If weather conditions are unsafe, we will contact you to reschedule or cancel your charter. In case of cancellation due to weather, you\'ll receive a full refund or can reschedule at no additional cost.',
    category: 'cancellation',
  },
  {
    id: '8',
    question: 'Do I need a fishing license?',
    answer: 'No, you don\'t need a fishing license for charter fishing trips. Our vessels are licensed and covered for all passengers.',
    category: 'general',
  },
  {
    id: '9',
    question: 'How many people can go on a charter?',
    answer: 'Capacity varies by vessel. Most of our vessels can accommodate 4-6 passengers, but we have options for larger groups. Check the vessel details when booking for specific capacity information.',
    category: 'booking',
  },
  {
    id: '10',
    question: 'What is included in the charter price?',
    answer: 'The charter price includes the vessel, captain, fishing equipment, bait, and basic amenities. Some vessels may include additional amenities - check the specific vessel listing for details.',
    category: 'payment',
  },
  {
    id: '11',
    question: 'Can I bring my own food and drinks?',
    answer: 'Yes, you\'re welcome to bring your own food and drinks. We recommend bringing plenty of water and snacks. Alcohol is permitted in moderation, but please drink responsibly.',
    category: 'general',
  },
  {
    id: '12',
    question: 'What if I get seasick?',
    answer: 'If you\'re prone to seasickness, we recommend taking motion sickness medication before your trip. Our captains are experienced in navigating waters to minimize motion, and we can adjust the trip if needed.',
    category: 'safety',
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
            <HelpCircle className="w-10 h-10" />
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600">Find answers to common questions about our charter services</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {faqCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4 mb-8">
          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No FAQs found</h3>
                <p className="text-gray-600">
                  Try adjusting your search or category filter
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((faq) => (
              <Card key={faq.id} className="overflow-hidden">
                <button
                  onClick={() => toggleItem(faq.id)}
                  className="w-full p-6 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                    {openItems.has(faq.id) && (
                      <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                    )}
                  </div>
                  <div className="mt-1">
                    {openItems.has(faq.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
              </Card>
            ))
          )}
        </div>

        {/* Contact CTA */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
              <p className="text-gray-700 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/contact">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Contact Support
                  </button>
                </Link>
                <Link href="/help">
                  <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Visit Help Center
                  </button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
