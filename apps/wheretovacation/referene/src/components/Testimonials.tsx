import { Star } from 'lucide-react';

const testimonials = [
  { name: "Sarah Johnson", location: "New York, USA", text: "Best vacation planning experience ever! Found my dream destination in minutes.", rating: 5, avatar: "SJ" },
  { name: "Michael Chen", location: "Singapore", text: "The filters made it so easy to find exactly what I was looking for. Highly recommend!", rating: 5, avatar: "MC" },
  { name: "Emma Williams", location: "London, UK", text: "Booked an amazing trip to Bali. The descriptions were accurate and helpful.", rating: 5, avatar: "EW" },
];

export function Testimonials() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">What Travelers Say</h2>
        <p className="text-xl text-gray-600 text-center mb-12">Join thousands of happy travelers</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
