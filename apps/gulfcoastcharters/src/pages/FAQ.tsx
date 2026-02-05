import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqCategories = [
  {
    category: 'Booking & Reservations',
    questions: [
      {
        q: 'How far in advance should I book a charter?',
        a: 'We recommend booking 2-4 weeks in advance, especially during peak season (May-September). Popular captains and prime dates can fill up months ahead. Last-minute bookings are sometimes available, but selection is limited.'
      },
      {
        q: 'What is your cancellation policy?',
        a: 'Cancellations made 7+ days before your trip receive a full refund. Cancellations 3-6 days prior receive 50% refund. Within 72 hours, no refund unless due to weather or captain cancellation. Weather cancellations are rescheduled or fully refunded.'
      },
      {
        q: 'What happens if the weather is bad?',
        a: 'Captain safety is our priority. If weather conditions are unsafe, your captain will contact you to reschedule or provide a full refund. Captains monitor forecasts closely and make final decisions 12-24 hours before departure.'
      }
    ]
  },
  {
    category: 'Pricing & Payments',
    questions: [
      {
        q: 'What is included in the charter price?',
        a: 'All charters include fishing licenses, rods, reels, tackle, bait, ice, and fish cleaning. Some captains provide snacks and drinks. Gratuity (15-20%) is customary but not included. Check individual listings for specifics.'
      },
      {
        q: 'Do I need to tip the captain?',
        a: 'Tipping is customary and appreciated. Standard gratuity is 15-20% of the charter cost. For exceptional service, many customers tip more. Tips can be cash or added through our platform.'
      },
      {
        q: 'Are there extra fees?',
        a: 'Most charters have no hidden fees. Some may charge for fuel surcharges, specialty trips (shark fishing, offshore), or additional passengers beyond the standard group size. All fees are clearly listed before booking.'
      }
    ]
  },
  {
    category: 'What to Bring',
    questions: [
      {
        q: 'What should I bring on the charter?',
        a: 'Bring sunscreen (reef-safe), sunglasses, hat, light jacket, closed-toe shoes, food/drinks, seasickness medication (if needed), and camera. Most captains provide coolers with ice for your catches and beverages.'
      },
      {
        q: 'Do I need a fishing license?',
        a: 'No! All our captains have commercial licenses that cover passengers. You can fish legally without purchasing your own license when on a licensed charter vessel.'
      },
      {
        q: 'Can I bring alcohol?',
        a: 'Most captains allow beer and wine in moderation. Hard liquor policies vary by captain. Always drink responsibly - intoxicated passengers may result in trip termination without refund. Check with your specific captain.'
      }
    ]
  },
  {
    category: 'Fishing Experience',
    questions: [
      {
        q: 'I have never fished before. Is that okay?',
        a: 'Absolutely! Our captains welcome anglers of all skill levels. They will teach you everything: casting, reeling, hook setting, and fish handling. Many specialize in family trips and first-time fishers.'
      },
      {
        q: 'What species can we catch?',
        a: 'Gulf Coast waters offer incredible variety: Red Snapper, Grouper, King Mackerel, Mahi Mahi, Tuna, Amberjack, Tarpon, Redfish, Speckled Trout, and more. Species vary by season, location, and trip type (inshore vs offshore).'
      },
      {
        q: 'Can we keep the fish we catch?',
        a: 'Yes! Captains will clean and bag your legal catches. They follow all FWC regulations on size limits, bag limits, and seasons. You take home fresh Gulf seafood - many customers freeze or cook their catch that evening.'
      }
    ]
  },
  {
    category: 'For Captains',
    questions: [
      {
        q: 'How do I become a listed captain?',
        a: 'Apply through our Captain Application page. You need a valid USCG Captain License, vessel insurance, safety equipment, and required permits. We verify all credentials before approval. Commission is 15% per booking.'
      },
      {
        q: 'How do I get paid?',
        a: 'Payments are processed within 48 hours of trip completion. Funds are deposited directly to your bank account. You receive 85% of the charter fee (we keep 15% commission). Track all earnings in your Captain Dashboard.'
      },
      {
        q: 'What if I need to cancel a trip?',
        a: 'Contact the customer immediately and notify us through your dashboard. Weather cancellations are understood. Other cancellations should be rare - we help you reschedule when possible. Frequent cancellations affect your listing ranking.'
      }
    ]
  }
];

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 px-2 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
      >
        <span className="font-medium text-gray-900">{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-blue-600 flex-shrink-0 ml-4" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />}
      </button>
      {isOpen && (
        <div className="px-2 pb-4 text-gray-600 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

export default function FAQ() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-gray-600">Everything you need to know about Gulf Coast Charters</p>
          </div>

          <div className="space-y-8">
            {faqCategories.map((category, idx) => (
              <Card key={idx} className="p-6">
                <h2 className="text-2xl font-bold text-blue-600 mb-4">{category.category}</h2>
                <div className="space-y-0">
                  {category.questions.map((item, qIdx) => (
                    <FAQItem key={qIdx} question={item.q} answer={item.a} />
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-12 p-8 bg-blue-600 text-white text-center">
            <h3 className="text-2xl font-bold mb-3">Still Have Questions?</h3>
            <p className="text-blue-100 mb-6">Our support team is here to help you plan the perfect fishing adventure</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:support@gulfcoastcharters.com" className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Email Support
              </a>
              <a href="tel:+18885551234" className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors">
                Call (888) 555-1234
              </a>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
