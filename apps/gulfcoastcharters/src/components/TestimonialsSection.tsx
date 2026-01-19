import { Star, Quote } from 'lucide-react';
import { Card } from './ui/card';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    location: 'Miami, FL',
    rating: 5,
    text: 'Amazing experience! Captain Mike was professional and the yacht was pristine. Best birthday celebration ever!',
    charter: 'Luxury Sunset Cruise',
    date: 'October 2024'
  },
  {
    id: 2,
    name: 'David Martinez',
    location: 'Tampa, FL',
    rating: 5,
    text: 'Caught a 40lb grouper! The fishing charter exceeded all expectations. Will definitely book again.',
    charter: 'Deep Sea Fishing',
    date: 'September 2024'
  },
  {
    id: 3,
    name: 'Emily Chen',
    location: 'Naples, FL',
    rating: 5,
    text: 'Perfect family day out. Kids loved snorkeling and the captain was great with them. Highly recommend!',
    charter: 'Family Adventure',
    date: 'November 2024'
  },
  {
    id: 4,
    name: 'Michael Brown',
    location: 'Sarasota, FL',
    rating: 5,
    text: 'Proposed to my girlfriend on the sunset cruise. Captain helped make it magical. Thank you!',
    charter: 'Romantic Sunset',
    date: 'October 2024'
  }
];

export default function TestimonialsSection() {
  return (
    <section className="container mx-auto px-4 py-16 mb-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          What Our Guests Say
        </h2>
        <p className="text-gray-600 text-lg">Real experiences from real adventurers</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id} className="p-6 hover:shadow-xl transition-shadow">
            <Quote className="w-8 h-8 text-blue-600 mb-4 opacity-50" />
            <div className="flex gap-1 mb-3">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-gray-700 mb-4 text-sm leading-relaxed">{testimonial.text}</p>
            <div className="border-t pt-4">
              <p className="font-semibold text-gray-900">{testimonial.name}</p>
              <p className="text-xs text-gray-500">{testimonial.location}</p>
              <p className="text-xs text-blue-600 mt-1">{testimonial.charter}</p>
              <p className="text-xs text-gray-400 mt-1">{testimonial.date}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
