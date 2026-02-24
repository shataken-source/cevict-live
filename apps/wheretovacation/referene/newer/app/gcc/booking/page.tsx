import { Button } from '@/components/ui/button';
import { Anchor, Phone, Clock, MapPin, Users, Calendar, Shield, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import GCCNavigation, { GCCFooter } from '@/components/GCCNavigation';
import BookingEngine from '@/components/BookingEngine';
import CaptainProfile, { sampleCaptainData } from '@/components/CaptainProfile';

export default function GCCBookingPage() {
  const popularTrips = [
    {
      name: 'Half Day Inshore',
      duration: '4 hours',
      guests: 'Up to 4',
      price: '$600',
      description: 'Perfect for families and beginners',
      features: ['All gear included', 'Fishing license', 'Refreshments', 'Fish cleaning']
    },
    {
      name: 'Full Day Offshore',
      duration: '8-10 hours',
      guests: 'Up to 6',
      price: '$1,200',
      description: 'Deep sea adventure for serious anglers',
      features: ['Premium tackle', 'Lunch included', 'Electronics', 'Multiple species']
    },
    {
      name: 'Sunset Cruise',
      duration: '2 hours',
      guests: 'Up to 6',
      price: '$400',
      description: 'Romantic evening on the water',
      features: ['Beverages', 'Music', 'Dolphin watching', 'Photo opportunities']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <GCCNavigation currentPage="booking" />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Calendar className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Book Your Gulf Coast Adventure</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Real-time availability, instant confirmation, and guaranteed best rates. 
              Book with confidence knowing every trip is backed by our satisfaction guarantee.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Shield className="w-4 h-4" />
                <span>USCG Licensed Captains</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span>Instant Confirmation</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Phone className="w-4 h-4" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Booking - Popular Trips */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Trips</h2>
            <p className="text-xl text-gray-600">Choose from our most requested charter experiences</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {popularTrips.map((trip, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{trip.name}</h3>
                  <div className="text-2xl font-bold text-blue-600">{trip.price}</div>
                </div>
                
                <p className="text-gray-600 mb-4">{trip.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{trip.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{trip.guests} guests</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Included:</p>
                  <ul className="space-y-1">
                    {trip.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button asChild className="w-full">
                  <Link href={`/gcc/booking?trip=${trip.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    Book This Trip
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Booking Engine */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Custom Trip Builder</h2>
            <p className="text-xl text-gray-600">Build your perfect fishing trip with our interactive booking system</p>
          </div>
          <BookingEngine />
        </div>
      </section>

      {/* Featured Captain */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Book With Our Featured Captain</h2>
            <p className="text-xl text-gray-600">Experience the difference with Captain Michael Thompson</p>
          </div>
          <CaptainProfile captain={sampleCaptainData} />
        </div>
      </section>

      {/* Booking Process */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple 3-Step Booking Process</h2>
            <p className="text-xl text-gray-600">Get on the water in minutes, not hours</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your Trip</h3>
              <p className="text-gray-600">
                Select from popular trips or build your custom adventure with our interactive booking system.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pick Date & Time</h3>
              <p className="text-gray-600">
                View real-time availability and select the perfect date and time for your Gulf Coast adventure.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm & Pay</h3>
              <p className="text-gray-600">
                Secure booking with instant confirmation. Receive all trip details via email and SMS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What's Included</h2>
            <p className="text-xl text-gray-600">Everything you need for a successful fishing trip</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <Anchor className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Premium Equipment</h3>
              <p className="text-gray-600 text-sm">
                Top-quality rods, reels, and tackle for all skill levels
              </p>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-xl">
              <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Licensed Captain</h3>
              <p className="text-gray-600 text-sm">
                USCG licensed, insured, and experienced guides
              </p>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl">
              <MapPin className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Fishing License</h3>
              <p className="text-gray-600 text-sm">
                All required licenses and permits included
              </p>
            </div>
            
            <div className="text-center p-6 bg-orange-50 rounded-xl">
              <CheckCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Fish Cleaning</h3>
              <p className="text-gray-600 text-sm">
                Complimentary fish cleaning and bagging service
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Adventure?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Book now or call us to speak with a fishing expert who can help plan your perfect trip.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-blue-600 hover:bg-blue-50">
              <Link href="#booking-form">
                Book Online Now
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-blue-600">
              <a href="tel:(251) 555-0123">
                <Phone className="w-5 h-5 mr-2" />
                Call (251) 555-0123
              </a>
            </Button>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
