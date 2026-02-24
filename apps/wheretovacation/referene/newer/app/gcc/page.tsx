import { Button } from '@/components/ui/button';
import { Anchor, ArrowRight, Search, Shield, Waves, MapPin, Phone, Star, Calendar, Fish, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import BookingEngine from '@/components/BookingEngine';
import CaptainProfile, { sampleCaptainData } from '@/components/CaptainProfile';
import LocationInfo from '@/components/LocationInfo';

export default function GCCLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Anchor className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gulf Coast Charters</h1>
                <p className="text-xs text-gray-500">Verified Fishing Adventures</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/boats" className="text-gray-700 hover:text-blue-600 font-medium">Find Boats</Link>
              <Link href="/captains" className="text-gray-700 hover:text-blue-600 font-medium">Captains</Link>
              <Link href="/charters" className="text-gray-700 hover:text-blue-600 font-medium">Charters</Link>
              <Link href="/weather" className="text-gray-700 hover:text-blue-600 font-medium">Weather</Link>
              <LocationInfo variant="header" />
            </nav>

            <div className="flex items-center gap-4">
              <a href="tel:(251) 555-0123" className="hidden sm:flex items-center gap-2 text-gray-700 hover:text-blue-600">
                <Phone className="w-4 h-4" />
                <span className="font-medium">(251) 555-0123</span>
              </a>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/booking">
                  Book Now
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center gap-4 mb-6">
              <Fish className="w-12 h-12" />
              <Anchor className="w-12 h-12" />
              <Waves className="w-12 h-12" />
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold mb-6">
              Gulf Coast Charters
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Verified charter fishing trips along the Gulf Coast. 
              <span className="block text-lg mt-2">Real captains. Real boats. Real adventures.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-blue-600 hover:bg-blue-50">
                <Link href="/boats">
                  <Search className="w-5 h-5 mr-2" />
                  Find a Boat
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/captains/apply">
                  <Shield className="w-5 h-5 mr-2" />
                  Become a Captain
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                <Star className="w-4 h-4" />
                <span>USCG Licensed Captains</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                <MapPin className="w-4 h-4" />
                <span>3 Pickup Locations</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                <Users className="w-4 h-4" />
                <span>Family Friendly</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">2500+</div>
              <div className="text-gray-600">Successful Trips</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">15+</div>
              <div className="text-gray-600">Years Experience</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">47</div>
              <div className="text-gray-600">Species Caught</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
              <div className="text-gray-600">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Gulf Coast Adventure Starts Here</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need for the perfect fishing trip, from verified captains to real-time booking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Find a Captain</h3>
              </div>
              <p className="text-gray-600 mb-6">Browse verified USCG-licensed captains with years of experience</p>
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-between group">
                  <Link href="/captains">
                    <span>Captain Directory</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild className="w-full justify-between bg-green-600 hover:bg-green-700 text-white">
                  <Link href="/captains/apply">
                    <span>Become a Captain</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Anchor className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Browse Charters</h3>
              </div>
              <p className="text-gray-600 mb-6">Discover the perfect fishing trip. Search by location, boat type, or specialty.</p>
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-between group">
                  <Link href="/boats">
                    <span>Available Boats</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild className="w-full justify-between bg-blue-600 hover:bg-blue-700 text-white">
                  <Link href="/charters">
                    <span>All Charters</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Waves className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Weather Intelligence</h3>
              </div>
              <p className="text-gray-600 mb-6">Real-time conditions, forecasts, and tide predictions</p>
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-between group">
                  <Link href="/weather">
                    <span>Weather Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between opacity-60" disabled>
                  <Link href="/tides">
                    <span>Tide Predictions</span>
                    <span className="text-xs text-gray-500">Coming Soon</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Captain */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Featured Captain</h2>
            <p className="text-xl text-gray-600">Professional, experienced, and ready to make your trip unforgettable</p>
          </div>
          <CaptainProfile captain={sampleCaptainData} />
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Book Your Adventure</h2>
            <p className="text-xl text-gray-600">Real-time availability and instant confirmation</p>
          </div>
          <BookingEngine />
        </div>
      </section>

      {/* Locations */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Convenient Pickup Locations</h2>
            <p className="text-xl text-gray-600">Multiple locations across the Alabama Gulf Coast</p>
          </div>
          <LocationInfo />
        </div>
      </section>

      {/* Popular Trips */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Fishing Trips</h2>
            <p className="text-xl text-gray-600">Choose from our most requested charter experiences</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <Fish className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Half Day Inshore</h3>
              </div>
              <div className="space-y-2 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>4 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Up to 4 guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Perfect for families</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-4">$600</div>
              <Button asChild className="w-full">
                <Link href="/booking?trip=half-day-inshore">
                  Book This Trip
                </Link>
              </Button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <Anchor className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Full Day Offshore</h3>
              </div>
              <div className="space-y-2 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>10 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Up to 6 guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Deep sea adventure</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600 mb-4">$1,800</div>
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link href="/booking?trip=full-day-offshore">
                  Book This Trip
                </Link>
              </Button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <Waves className="w-8 h-8 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">Sunset Cruise</h3>
              </div>
              <div className="space-y-2 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>2 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Up to 6 guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Romantic & relaxing</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-600 mb-4">$400</div>
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                <Link href="/booking?trip=sunset-cruise">
                  Book This Trip
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Gulf Coast Adventure?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied anglers who have experienced the best fishing trips on the Gulf Coast.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-blue-600 hover:bg-blue-50">
              <Link href="/booking">
                Book Your Trip Now
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/boats">
                Browse All Boats
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Anchor className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">Gulf Coast Charters</h3>
                  <p className="text-gray-400 text-sm">Verified Fishing Adventures</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                Your trusted source for professional charter fishing experiences on the Gulf Coast.
              </p>
              <LocationInfo variant="footer" />
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/charters" className="hover:text-white">Fishing Charters</Link></li>
                <li><Link href="/boats" className="hover:text-white">Boat Rentals</Link></li>
                <li><Link href="/captains" className="hover:text-white">Captain Directory</Link></li>
                <li><Link href="/booking" className="hover:text-white">Online Booking</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/weather" className="hover:text-white">Weather & Tides</Link></li>
                <li><Link href="/fishing-report" className="hover:text-white">Fishing Reports</Link></li>
                <li><Link href="/seasonal-guide" className="hover:text-white">Seasonal Guide</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>(251) 555-0123</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Orange Beach, AL</span>
                </div>
                <div>
                  <a href="mailto:info@gulfcoastcharters.com" className="hover:text-white">
                    info@gulfcoastcharters.com
                  </a>
                </div>
              </div>
              <div className="mt-4">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/booking">Book Now</Link>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Gulf Coast Charters. All rights reserved. | 
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link> | 
              <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
