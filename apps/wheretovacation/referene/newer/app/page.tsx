import Link from 'next/link';
import { MapPin, Utensils, UmbrellaBeach, Calendar, Search, Users, BookOpen } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section - Enhanced */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse"></div>
        </div>

        {/* Floating Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-40 h-40 bg-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-20 right-20 w-60 h-60 bg-indigo-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-blue-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="text-center">
            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 drop-shadow-2xl animate-fade-in-up">
              Where To Vacation
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl lg:text-3xl text-blue-100 mb-4 max-w-4xl mx-auto font-medium animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Your local guide to the Alabama Gulf Coast
            </p>
            <p className="text-lg md:text-xl text-blue-200 mb-10 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              Discover authentic local insights, hidden gems, and plan your perfect vacation.
            </p>

            {/* Enhanced CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Link
                href="/search"
                className="group px-8 py-6 text-lg bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-semibold inline-flex items-center justify-center gap-2 shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300"
              >
                <Search className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                Search Destinations
              </Link>
              <Link
                href="/planning/trip-planner"
                className="group px-8 py-6 text-lg bg-indigo-700/90 backdrop-blur-sm text-white rounded-xl hover:bg-indigo-600 border-2 border-white/50 font-semibold inline-flex items-center justify-center gap-2 shadow-2xl hover:shadow-white/50 transform hover:scale-105 transition-all duration-300"
              >
                <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                Plan Your Trip
              </Link>
              <Link
                href="/search?type=rental"
                className="group px-8 py-6 text-lg border-2 border-white text-white rounded-xl hover:bg-white hover:text-indigo-600 font-semibold inline-flex items-center justify-center gap-2 backdrop-blur-sm hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <BookOpen className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                Find Rentals
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-3 rounded-full border border-white/30">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Local Experts</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-3 rounded-full border border-white/30">
                <Users className="w-5 h-5" />
                <span className="font-medium">Trusted Reviews</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-3 rounded-full border border-white/30">
                <Star className="w-5 h-5" />
                <span className="font-medium">Best Prices</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Beach Comparison */}
            <Link
              href="/beach-comparison"
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all group"
            >
              <UmbrellaBeach className="w-12 h-12 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Beach Comparison</h3>
              <p className="text-gray-600">Gulf Shores vs Orange Beach - which is right for you?</p>
            </Link>

            {/* Where Locals Eat */}
            <Link
              href="/local-guides/where-locals-go"
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all group"
            >
              <Utensils className="w-12 h-12 text-green-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Where Locals Eat</h3>
              <p className="text-gray-600">Skip tourist traps, eat where locals dine</p>
            </Link>

            {/* Rainy Day Guide */}
            <Link
              href="/rainy-day-guide"
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all group"
            >
              <Calendar className="w-12 h-12 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Rainy Day Guide</h3>
              <p className="text-gray-600">50+ indoor activities when weather doesn't cooperate</p>
            </Link>

            {/* Trip Planner */}
            <Link
              href="/planning/trip-planner"
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all group"
            >
              <BookOpen className="w-12 h-12 text-orange-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Trip Planner</h3>
              <p className="text-gray-600">Build your perfect Gulf Coast itinerary</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Sections */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Vacation Rentals */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Vacation Rentals</h2>
              <p className="text-gray-600 mb-6">
                Find the perfect beachfront condo, family-friendly house, or luxury villa for your Gulf Coast stay.
              </p>
              <Link
                href="/search?type=rental"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Browse Rentals
                <Search className="w-4 h-4" />
              </Link>
            </div>

            {/* Activities */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Activities & Attractions</h2>
              <p className="text-gray-600 mb-6">
                Discover the best things to do on the Gulf Coast - from fishing charters to dolphin tours.
              </p>
              <Link
                href="/activities"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Explore Activities
                <Users className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Footer */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/beach-comparison" className="text-blue-600 hover:text-blue-800 font-medium">Beach Comparison</Link>
            <Link href="/rainy-day-guide" className="text-blue-600 hover:text-blue-800 font-medium">Rainy Day Guide</Link>
            <Link href="/local-guides/where-locals-go" className="text-blue-600 hover:text-blue-800 font-medium">Where Locals Eat</Link>
            <Link href="/vacation-rental-checklist" className="text-blue-600 hover:text-blue-800 font-medium">Rental Checklist</Link>
            <Link href="/gear-recommendations" className="text-blue-600 hover:text-blue-800 font-medium">Gear Recommendations</Link>
            <Link href="/planning/trip-planner" className="text-blue-600 hover:text-blue-800 font-medium">Trip Planner</Link>
            <Link href="/community" className="text-blue-600 hover:text-blue-800 font-medium">Community</Link>
            <Link href="/reviews" className="text-blue-600 hover:text-blue-800 font-medium">Reviews</Link>
          </div>
        </div>
      </section>
    </div>
  );
}



