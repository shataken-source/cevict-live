import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How far in advance should I book?',
      a: 'We recommend booking 2-3 months in advance for peak season (June-August). For off-season, 2-4 weeks is usually sufficient.'
    },
    {
      q: 'What is your cancellation policy?',
      a: 'Free cancellation up to 48 hours before departure. Cancellations within 48 hours receive a 50% refund. No-shows are non-refundable.'
    },
    {
      q: 'Are captains and crew included?',
      a: 'Yes! All charters include a professional captain and crew. Gratuity (15-20%) is customary but not included in the base price.'
    },
    {
      q: 'What happens in bad weather?',
      a: 'Safety first! If weather is unsafe, we offer full refunds or free rescheduling. Our captains make the final call based on conditions.'
    },
    {
      q: 'Can I bring my own food and drinks?',
      a: 'Absolutely! Most charters allow you to bring your own provisions. Some also offer catering services for an additional fee.'
    },
    {
      q: 'Do you offer insurance?',
      a: 'Yes, we offer optional travel insurance covering cancellations, medical emergencies, and trip interruptions. Highly recommended!'
    }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition"
            >
              <span className="font-semibold text-lg">{faq.q}</span>
              {openIndex === idx ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openIndex === idx && (
              <div className="px-6 pb-4 text-gray-700">{faq.a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
