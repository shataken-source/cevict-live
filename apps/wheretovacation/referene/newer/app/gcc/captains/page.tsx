import { Button } from '@/components/ui/button';
import { Anchor, Search, Filter, MapPin, Phone, Star, Shield, Award, Calendar } from 'lucide-react';
import Link from 'next/link';
import GCCNavigation, { GCCFooter } from '@/components/GCCNavigation';

export default function GCCCaptainsPage() {
  const captains = [
    {
      id: 'michael-thompson',
      name: 'Captain Michael Thompson',
      experience: '15+ Years',
      license: 'USCG Master Captain',
      specialty: 'Inshore & Nearshore',
      rating: 4.9,
      trips: 2500,
      location: 'Orange Beach, AL',
      bio: 'Born and raised on the Gulf Coast, Captain Thompson specializes in redfish and speckled trout fishing.',
      image: '/captain-thompson.webp',
      available: true
    },
    {
      id: 'james-wilson',
      name: 'Captain James Wilson',
      experience: '12+ Years',
      license: 'USCG Master Captain',
      specialty: 'Offshore & Big Game',
      rating: 4.8,
      trips: 1800,
      location: 'Gulf Shores, AL',
      bio: 'Expert offshore angler with tournament wins and deep sea fishing expertise.',
      image: '/captain-wilson.webp',
      available: true
    },
    {
      id: 'sarah-davis',
      name: 'Captain Sarah Davis',
      experience: '8+ Years',
      license: 'USCG Master Captain',
      specialty: 'Fly Fishing & Light Tackle',
      rating: 5.0,
      trips: 950,
      location: 'Fort Morgan, AL',
      bio: 'Fly fishing specialist with a passion for teaching beginners and advanced techniques.',
      image: '/captain-davis.webp',
      available: false
    },
    {
      id: 'robert-martinez',
      name: 'Captain Robert Martinez',
      experience: '20+ Years',
      license: 'USCG Master Captain',
      specialty: 'Flats & Sight Casting',
      rating: 4.7,
      trips: 3200,
      location: 'Orange Beach, AL',
      bio: 'Veteran flats fishing guide with unmatched knowledge of shallow water ecosystems.',
      image: '/captain-martinez.webp',
      available: true
    },
    {
      id: 'thomas-anderson',
      name: 'Captain Thomas Anderson',
      experience: '18+ Years',
      license: 'USCG Master Captain',
      specialty: 'Tournament & Luxury',
      rating: 4.9,
      trips: 2100,
      location: 'Gulf Shores, AL',
      bio: 'Tournament-proven captain specializing in big game and luxury charters.',
      image: '/captain-anderson.webp',
      available: true
    },
    {
      id: 'jennifer-lee',
      name: 'Captain Jennifer Lee',
      experience: '6+ Years',
      license: 'USCG Master Captain',
      specialty: 'Family & Eco Tours',
      rating: 4.8,
      trips: 650,
      location: 'Orange Beach, AL',
      bio: 'Family-friendly captain with expertise in dolphin tours and educational trips.',
      image: '/captain-lee.webp',
      available: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <GCCNavigation currentPage="captains" />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Meet Our Captains</h1>
            <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
              All our captains are USCG-licensed, insured, and have extensive experience fishing the Gulf Coast waters. 
              Each captain brings unique expertise and a passion for creating unforgettable experiences.
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">100%</div>
                <div className="text-green-200 text-sm">USCG Licensed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">10+</div>
                <div className="text-green-200 text-sm">Years Average</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">12K+</div>
                <div className="text-green-200 text-sm">Total Trips</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">4.8</div>
                <div className="text-green-200 text-sm">Avg Rating</div>
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
                placeholder="Search by captain name or specialty..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                <option>All Specialties</option>
                <option>Inshore Fishing</option>
                <option>Offshore</option>
                <option>Fly Fishing</option>
                <option>Family Friendly</option>
              </select>
              
              <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                <option>All Locations</option>
                <option>Orange Beach</option>
                <option>Gulf Shores</option>
                <option>Fort Morgan</option>
              </select>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                More Filters
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Captains Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Available Captains ({captains.length})</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Sort by:</span>
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                <option>Recommended</option>
                <option>Rating</option>
                <option>Experience</option>
                <option>Trip Count</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {captains.map((captain) => (
              <div key={captain.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                {/* Captain Photo */}
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Shield className="w-20 h-20 mx-auto mb-2" />
                      <p className="text-lg">Captain Photo</p>
                    </div>
                  </div>
                  
                  {/* Availability Badge */}
                  <div className="absolute top-4 left-4">
                    {captain.available ? (
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
                    {captain.rating}
                  </div>
                </div>

                {/* Captain Info */}
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{captain.name}</h3>
                    <p className="text-gray-600 text-sm">{captain.specialty}</p>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Experience:</span>
                      <span className="font-medium text-gray-900">{captain.experience}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">License:</span>
                      <span className="font-medium text-gray-900">{captain.license}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Trips:</span>
                      <span className="font-medium text-gray-900">{captain.trips.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-gray-900">{captain.location}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">{captain.bio}</p>
                  </div>

                  <div className="flex gap-3">
                    <Button asChild className="flex-1" disabled={!captain.available}>
                      <Link href={`/gcc/booking?captain=${captain.id}`}>
                        {captain.available ? 'Book Captain' : 'Unavailable'}
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/gcc/captains/${captain.id}`}>
                        View Profile
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
              View All Captains
            </Button>
          </div>
        </div>
      </section>

      {/* Become a Captain CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-8 text-white text-center">
            <Award className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Are You a Captain?</h2>
            <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
              Join our network of professional captains. Get access to our booking system, 
              marketing support, and a steady stream of qualified customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-green-600 hover:bg-green-50">
                <Link href="/gcc/captains/apply">
                  Apply to Join
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-green-600">
                <Link href="/gcc/captains/requirements">
                  View Requirements
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
