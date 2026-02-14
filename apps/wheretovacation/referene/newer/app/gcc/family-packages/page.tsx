import GCCNavigation, { GCCFooter } from '@/components/GCCNavigation';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Clock, 
  Fish, 
  Star, 
  CheckCircle, 
  Heart, 
  Camera, 
  Anchor,
  Phone,
  Calendar,
  MapPin,
  DollarSign,
  Shield
} from 'lucide-react';
import Link from 'next/link';

export default function FamilyPackagesPage() {
  const familyPackages = [
    {
      name: "Short & Sweet Catch",
      duration: "2 Hours",
      price: "$299",
      maxPeople: "4 People",
      description: "Perfect introduction to fishing for families with young kids. We stay close to shore in calm waters where the fish are plentiful and the seas are gentle.",
      highlights: [
        "Kid-friendly fishing spots",
        "Calm protected waters",
        "All gear sized for kids",
        "Professional photos included",
        "Fish cleaning included"
      ],
      bestFor: "Families with kids 5-12, first-time fishers",
      departureTimes: "9:00 AM, 11:00 AM, 1:00 PM",
      whatToExpect: "Lots of action with smaller fish that are easy for kids to catch",
      cancellationPolicy: "Free cancellation up to 24 hours"
    },
    {
      name: "Family Adventure",
      duration: "4 Hours",
      price: "$499",
      maxPeople: "6 People",
      description: "Our most popular family package! More time to explore different fishing spots and teach everyone the basics. Great for mixed-age families.",
      highlights: [
        "Multiple fishing locations",
        "Teaching focused trip",
        "Snacks and drinks provided",
        "Fish cleaning service",
        "Captain's choice of best spots"
      ],
      bestFor: "Families with teens, mixed ages, groups of friends",
      departureTimes: "7:00 AM, 11:00 AM, 3:00 PM",
      whatToExpect: "Variety of fish species, everyone gets personal attention",
      cancellationPolicy: "Free cancellation up to 48 hours"
    },
    {
      name: "Ultimate Family Experience",
      duration: "6 Hours",
      price: "$699",
      maxPeople: "6 People",
      description: "The complete Gulf Coast fishing adventure! Time to try different techniques, visit multiple spots, and create memories that last a lifetime.",
      highlights: [
        "Multiple fishing techniques",
        "Lunch included on board",
        "Professional photography",
        "Premium tackle provided",
        "Flexible itinerary"
      ],
      bestFor: "Serious fishing families, special occasions, multi-generational trips",
      departureTimes: "7:00 AM, 8:00 AM",
      whatToExpect: "Big fish potential, learning advanced techniques, full day adventure",
      cancellationPolicy: "Free cancellation up to 72 hours"
    }
  ];

  const familyFeatures = [
    {
      icon: Shield,
      title: "Safety First",
      description: "USCG licensed captains, child-sized life jackets, first aid certified crew"
    },
    {
      icon: Heart,
      title: "Kid-Friendly",
      description: "Patient captains experienced with children, no pressure environment"
    },
    {
      icon: Camera,
      title: "Memory Making",
      description: "Professional photos of your catches, frame-worthy moments guaranteed"
    },
    {
      icon: Fish,
      title: "Guaranteed Action",
      description: "We know the spots where kids can actually catch fish, not just fish"
    }
  ];

  const whatParentsSay = [
    {
      name: "Sarah Johnson",
      location: "Birmingham, AL",
      quote: "Our 6-year-old caught 5 fish! The captain was so patient and made it fun for everyone. Best family activity we've ever done!",
      rating: 5,
      trip: "Short & Sweet Catch"
    },
    {
      name: "Mike Thompson",
      location: "Atlanta, GA",
      quote: "I was worried my teens would be bored, but they loved it! The captain taught them so much and we all had a blast.",
      rating: 5,
      trip: "Family Adventure"
    },
    {
      name: "Emily Davis",
      location: "Nashville, TN",
      quote: "Worth every penny! The photos alone are priceless. Our kids still talk about their fishing adventure.",
      rating: 5,
      trip: "Ultimate Family Experience"
    }
  ];

  const faqs = [
    {
      question: "What if my kids get seasick?",
      answer: "We stay in calm protected waters for family trips, and our captains are experienced with preventing seasickness. We also recommend motion sickness medication taken the night before and morning of the trip."
    },
    {
      question: "Do you provide life jackets for children?",
      answer: "Yes! We have USCG-approved life jackets in all sizes, including infant and child sizes. Safety is our top priority."
    },
    {
      question: "What if we don't catch any fish?",
      answer: "While we can't guarantee fish, our family trips have a 95% success rate. We know the spots where fish bite consistently, especially for kid-friendly species."
    },
    {
      question: "Can we bring our own snacks and drinks?",
      answer: "Absolutely! You're welcome to bring snacks and drinks. Coolers are provided on longer trips, and we include water on all trips."
    },
    {
      question: "What's the youngest age you recommend?",
      answer: "We've taken kids as young as 3, but 5+ is ideal for the full experience. The 2-hour trip is perfect for younger children."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <GCCNavigation currentPage="packages" />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Family-First Fishing Packages</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Designed specifically for families with kids. Shorter trips, calmer waters, and patient captains 
              who make fishing fun for everyone - even the littlest anglers!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Clock className="w-4 h-4" />
                <span>2-6 Hour Options</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Heart className="w-4 h-4" />
                <span>Kid-Friendly Focus</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Star className="w-4 h-4" />
                <span>95% Success Rate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Family Packages */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Families Choose Our Packages</h2>
            <p className="text-xl text-gray-600">
              We're not just fishing charters - we're memory makers
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {familyFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Family Packages */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Family Adventure</h2>
            <p className="text-xl text-gray-600">
              Three packages designed for different family needs and schedules
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {familyPackages.map((pkg, index) => (
              <div key={index} className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all ${
                index === 1 ? 'ring-2 ring-blue-500 transform scale-105' : ''
              }`}>
                {index === 1 && (
                  <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <div className="flex items-center justify-center gap-4 text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{pkg.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{pkg.maxPeople}</span>
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mb-2">{pkg.price}</div>
                    <p className="text-gray-600 text-sm">Total for the group</p>
                  </div>

                  <p className="text-gray-600 mb-6">{pkg.description}</p>
                  
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-900 mb-3">What's Included:</p>
                    <ul className="space-y-2">
                      {pkg.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Best for:</span>
                      <span className="font-medium text-gray-900">{pkg.bestFor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Departure times:</span>
                      <span className="font-medium text-gray-900">{pkg.departureTimes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">What to expect:</span>
                      <span className="font-medium text-gray-900">{pkg.whatToExpect}</span>
                    </div>
                  </div>

                  <Button className="w-full mb-3">
                    Book This Package
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    {pkg.cancellationPolicy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Parents Say */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Parents Are Saying</h2>
            <p className="text-xl text-gray-600">
              Real reviews from real families who've fished with us
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {whatParentsSay.map((review, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{review.quote}"</p>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{review.name}</p>
                  <p className="text-gray-600">{review.location}</p>
                  <p className="text-blue-600">{review.trip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">
              Everything parents need to know about our family fishing trips
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Create Family Memories?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Book your family fishing adventure today - spots fill up quickly, especially during summer!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Phone className="w-5 h-5 mr-2" />
                Call to Book
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Calendar className="w-5 h-5 mr-2" />
                Check Availability
              </Button>
            </div>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
