import { Button } from '@/components/ui/button';
import { Anchor, Search, Filter, MapPin, Users, Clock, Star, Phone } from 'lucide-react';
import Link from 'next/link';
import GCCNavigation, { GCCFooter } from '@/components/GCCNavigation';
import OptimizedImage from '@/components/OptimizedImage';

export default function GCCBoatsPage() {
  const boats = [
    {
      id: 'sea-hunter-32',
      name: 'Sea Hunter 32',
      type: 'Center Console',
      capacity: 6,
      captain: 'Captain Michael Thompson',
      rating: 4.9,
      reviews: 127,
      price: 600,
      duration: '4 hours',
      specialties: ['Inshore Fishing', 'Nearshore', 'Family Friendly'],
      image: '/sea-hunter-32.webp',
      available: true
    },
    {
      id: 'bertram-35',
      name: 'Bertram 35',
      type: 'Sportfisher',
      capacity: 6,
      captain: 'Captain James Wilson',
      rating: 4.8,
      reviews: 98,
      price: 1200,
      duration: '8 hours',
      specialties: ['Offshore', 'Deep Sea', 'Big Game'],
      image: '/bertram-35.webp',
      available: true
    },
    {
      id: 'pursuit-2870',
      name: 'Pursuit 2870',
      type: 'Walkaround',
      capacity: 4,
      captain: 'Captain Sarah Davis',
      rating: 5.0,
      reviews: 89,
      price: 800,
      duration: '6 hours',
      specialties: ['Fly Fishing', 'Light Tackle', 'Scenic Tours'],
      image: '/pursuit-2870.webp',
      available: false
    },
    {
      id: 'carolina-skiff-21',
      name: 'Carolina Skiff 21',
      type: 'Flats Boat',
      capacity: 3,
      captain: 'Captain Robert Martinez',
      rating: 4.7,
      reviews: 156,
      price: 400,
      duration: '4 hours',
      specialties: ['Flats Fishing', 'Sight Casting', 'Shallow Water'],
      image: '/carolina-skiff-21.webp',
      available: true
    },
    {
      id: 'viking-42',
      name: 'Viking 42',
      type: 'Convertible',
      capacity: 6,
      captain: 'Captain Thomas Anderson',
      rating: 4.9,
      reviews: 203,
      price: 2000,
      duration: '10 hours',
      specialties: ['Tournament Fishing', 'Overnight', 'Luxury'],
      image: '/viking-42.webp',
      available: true
    },
    {
      id: 'boston-whaler-27',
      name: 'Boston Whaler 27',
      type: 'Center Console',
      capacity: 5,
      captain: 'Captain Jennifer Lee',
      rating: 4.8,
      reviews: 74,
      price: 700,
      duration: '6 hours',
      specialties: ['Family Trips', 'Snorkeling', 'Dolphin Tours'],
      image: '/boston-whaler-27.webp',
      available: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <GCCNavigation currentPage="boats" />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Anchor className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Find Your Perfect Boat</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Browse our fleet of professionally maintained vessels, each operated by USCG-licensed captains 
              with years of Gulf Coast experience.
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">12+</div>
                <div className="text-blue-200 text-sm">Premium Boats</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">100%</div>
                <div className="text-blue-200 text-sm">USCG Licensed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">24/7</div>
                <div className="text-blue-200 text-sm">Support</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">98%</div>
                <div className="text-blue-200 text-sm">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by boat name, captain, or specialty..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>All Boat Types</option>
                <option>Center Console</option>
                <option>Sportfisher</option>
                <option>Walkaround</option>
                <option>Flats Boat</option>
              </select>
              
              <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>All Specialties</option>
                <option>Inshore Fishing</option>
                <option>Offshore</option>
                <option>Family Friendly</option>
                <option>Fly Fishing</option>
              </select>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                More Filters
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Boats Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Available Boats ({boats.length})</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Sort by:</span>
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Rating</option>
                <option>Capacity</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {boats.map((boat) => (
              <div key={boat.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                {/* Boat Image */}
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Anchor className="w-16 h-16 mx-auto mb-2" />
                      <p className="text-sm">Boat Photo</p>
                    </div>
                  </div>
                  
                  {/* Availability Badge */}
                  <div className="absolute top-4 left-4">
                    {boat.available ? (
                      <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                        Available
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                        Booked
                      </span>
                    )}
                  </div>
                  
                  {/* Rating Badge */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {boat.rating}
                  </div>
                </div>

                {/* Boat Info */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{boat.name}</h3>
                      <p className="text-gray-600 text-sm">{boat.type}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">${boat.price}</div>
                      <div className="text-xs text-gray-500">{boat.duration}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{boat.capacity} guests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      <span>{boat.reviews} reviews</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Captain:</p>
                    <p className="text-sm text-gray-600">{boat.captain}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Specialties:</p>
                    <div className="flex flex-wrap gap-1">
                      {boat.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button asChild className="flex-1" disabled={!boat.available}>
                      <Link href={`/gcc/booking?boat=${boat.id}`}>
                        {boat.available ? 'Book Now' : 'Unavailable'}
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/gcc/boats/${boat.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" className="px-8">
              Load More Boats
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Don't See What You're Looking For?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Our fleet is constantly growing. Contact us directly for custom charters or special requests.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-blue-600 hover:bg-blue-50">
              <Link href="/gcc/booking">
                Request Custom Trip
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-blue-600">
              <a href="tel:(251) 555-0123">
                <Phone className="w-5 h-5 mr-2" />
                Call Us
              </a>
            </Button>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
