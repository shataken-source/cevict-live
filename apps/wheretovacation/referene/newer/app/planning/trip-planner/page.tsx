import Navigation from '@/components/Navigation';
import WTVFooter from '@/components/WTVFooter';
import FinnTripPlanner from '@/components/FinnTripPlanner';
import { Sparkles, MapPin, Calendar, Users, Star } from 'lucide-react';

export default function TripPlannerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Meet Finn - Your AI Trip Planner</h1>
            <p className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto">
              Let Finn, our intelligent travel assistant, help you create the perfect vacation. 
              Just tell Finn about your dream trip and watch as your personalized itinerary comes to life.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <MapPin className="w-4 h-4" />
                <span>Smart Destination Recommendations</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Calendar className="w-4 h-4" />
                <span>Personalized Itineraries</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Users className="w-4 h-4" />
                <span>Budget-Friendly Planning</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Star className="w-4 h-4" />
                <span>Local Expert Tips</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Finn for Your Trip Planning?</h2>
            <p className="text-xl text-gray-600">AI-powered assistance with human-like understanding</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">AI-Powered</h3>
              <p className="text-gray-600">
                Advanced AI understands your preferences and creates personalized recommendations
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Local Knowledge</h3>
              <p className="text-gray-600">
                Insider tips and hidden gems from our Albertville, AL travel experts
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Planning</h3>
              <p className="text-gray-600">
                Get complete trip plans in minutes, not hours of research
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Group Friendly</h3>
              <p className="text-gray-600">
                Plans for families, couples, solo travelers, and friend groups
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Trip Planner */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Start Planning with Finn</h2>
            <p className="text-xl text-gray-600">
              Just tell Finn what kind of trip you're dreaming of, and let the AI magic begin!
            </p>
          </div>
          
          <FinnTripPlanner />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How Finn Works</h2>
            <p className="text-xl text-gray-600">Simple steps to your perfect vacation</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Chat with Finn</h3>
              <p className="text-gray-600">
                Tell Finn about your ideal trip - destinations, activities, budget, and travel dates
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Get Recommendations</h3>
              <p className="text-gray-600">
                Finn provides personalized suggestions and helps you build your itinerary
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Your Plan</h3>
              <p className="text-gray-600">
                Review your complete trip with costs, timing, and booking recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Trip Ideas */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Trip Ideas</h2>
            <p className="text-xl text-gray-600">Get inspired with these Finn-approved destinations</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Gulf Coast Beach Week</h3>
              <p className="text-gray-600 mb-4">
                7 days of sun, sand, and seafood in Orange Beach and Gulf Shores
              </p>
              <div className="text-sm text-gray-500">
                Perfect for families • $800-1200 per person
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Smoky Mountain Escape</h3>
              <p className="text-gray-600 mb-4">
                5 days of hiking, cabins, and mountain air in Tennessee
              </p>
              <div className="text-sm text-gray-500">
                Perfect for couples • $600-900 per person
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Nashville Music City</h3>
              <p className="text-gray-600 mb-4">
                3 days of live music, food, and honky-tonks
              </p>
              <div className="text-sm text-gray-500">
                Perfect for groups • $500-800 per person
              </div>
            </div>
          </div>
        </div>
      </section>

      <WTVFooter />
    </div>
  );
}
