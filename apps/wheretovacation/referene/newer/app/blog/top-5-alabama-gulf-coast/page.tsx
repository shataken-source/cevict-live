import { Button } from '@/components/ui/button';
import { Anchor, Fish, MapPin, Calendar, Star, Users, Camera, Sun, Waves, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import WTVFooter from '@/components/WTVFooter';

export default function Top5AlabamaGulfCoastPage() {
  const activities = [
    {
      id: 1,
      title: "Charter Fishing Adventure",
      description: "Experience the thrill of deep-sea fishing with USCG-licensed captains. Target redfish, speckled trout, and even sharks in the pristine Gulf waters.",
      icon: Fish,
      color: "from-blue-500 to-cyan-500",
      highlights: ["USCG Licensed Captains", "All Equipment Provided", "Fish Cleaning Included", "Family Friendly"],
      duration: "4-10 hours",
      bestFor: "Anglers of all levels",
      bookLink: "https://gulfcoastcharters.com"
    },
    {
      id: 2,
      title: "Beach Day at Gulf State Park",
      description: "Miles of sugar-white sand beaches with pavilions, picnic areas, and the Gulf State Park Pier. Perfect for families and sunset watchers.",
      icon: Sun,
      color: "from-yellow-500 to-orange-500",
      highlights: ["2 Miles of Beaches", "Fishing Pier", "Nature Trails", "Clean Facilities"],
      duration: "Full day",
      bestFor: "Families and beach lovers",
      bookLink: null
    },
    {
      id: 3,
      title: "Dolphin & Sunset Cruise",
      description: "Watch playful dolphins in their natural habitat while enjoying a breathtaking Gulf Coast sunset. Great for couples and families.",
      icon: Waves,
      color: "from-purple-500 to-pink-500",
      highlights: ["Dolphin Sightings", "Sunset Views", "Educational Commentary", "Refreshments Available"],
      duration: "2 hours",
      bestFor: "All ages",
      bookLink: null
    },
    {
      id: 4,
      title: "Explore The Wharf",
      description: "Premier entertainment destination with shopping, dining, ferris wheel, and live entertainment. The heart of Orange Beach nightlife.",
      icon: MapPin,
      color: "from-green-500 to-emerald-500",
      highlights: ["Ferris Wheel", "Live Music", "Shopping", "Waterfront Dining"],
      duration: "Evening",
      bestFor: "Couples and groups",
      bookLink: null
    },
    {
      id: 5,
      title: "Bon Secour National Wildlife Refuge",
      description: "Explore 7,000 acres of protected coastal habitat. Perfect for bird watching, hiking, and experiencing Alabama's natural beauty.",
      icon: Camera,
      color: "from-teal-500 to-cyan-500",
      highlights: ["Bird Watching", "Hiking Trails", "Photography", "Educational Programs"],
      duration: "2-4 hours",
      bestFor: "Nature enthusiasts",
      bookLink: null
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Star className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Top 5 Things to Do on the Alabama Gulf Coast</h1>
            <p className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto">
              From thrilling fishing adventures to peaceful beach days, discover the best experiences 
              the Alabama Gulf Coast has to offer. Curated by locals who know these waters best.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <MapPin className="w-4 h-4" />
                <span>Alabama Gulf Coast</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Calendar className="w-4 h-4" />
                <span>Year-Round Activities</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Users className="w-4 h-4" />
                <span>For All Ages</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Activity - Charter Fishing */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-white mb-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Fish className="w-8 h-8" />
                  <h2 className="text-3xl font-bold">Featured: Charter Fishing Adventure</h2>
                </div>
                <p className="text-blue-100 mb-6 text-lg">
                  Experience the ultimate Gulf Coast adventure with professional fishing charters. 
                  Our top recommendation for visitors who want to experience the real Alabama Gulf Coast.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span>USCG Licensed Captains</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>All Experience Levels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>Year-Round Fishing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    <span>98% Satisfaction Rate</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                    <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                      Book Your Fishing Trip
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600">
                    <Link href="#activities">
                      See Other Activities
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Why Choose Charter Fishing?</h3>
                <ul className="space-y-3 text-blue-100">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Professional captains with 15+ years local experience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>All equipment, licenses, and bait included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Catch redfish, speckled trout, and seasonal species</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Perfect for families, beginners, and experienced anglers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Professional fish cleaning included</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Activities */}
      <section id="activities" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Complete Gulf Coast Experience</h2>
            <p className="text-xl text-gray-600">Mix and match these activities for the perfect vacation</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                  <div className={`h-2 bg-gradient-to-r ${activity.color}`} />
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${activity.color} rounded-full flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{activity.title}</h3>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{activity.description}</p>
                    
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium text-gray-900">{activity.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Best For:</span>
                        <span className="font-medium text-gray-900">{activity.bestFor}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Highlights:</p>
                      <div className="flex flex-wrap gap-1">
                        {activity.highlights.map((highlight, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {activity.bookLink ? (
                      <Button asChild className="w-full">
                        <Link href={activity.bookLink} target="_blank" rel="noopener noreferrer">
                          Book This Activity
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Learn More
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Local Tips Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Local's Insider Tips</h2>
            <p className="text-xl text-gray-600">From our Albertville, AL team to you</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-xl p-6">
              <Calendar className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Best Time to Visit</h3>
              <p className="text-gray-600 text-sm">
                March-May and September-November offer perfect weather and fewer crowds.
              </p>
            </div>
            
            <div className="bg-green-50 rounded-xl p-6">
              <MapPin className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Avoid Tourist Traps</h3>
              <p className="text-gray-600 text-sm">
                Eat at local seafood markets instead of beachfront restaurants for better prices.
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-6">
              <Sun className="w-8 h-8 text-purple-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sunset Strategy</h3>
              <p className="text-gray-600 text-sm">
                The best sunset views are from the Gulf State Park pier - arrive 30 minutes early.
              </p>
            </div>
            
            <div className="bg-orange-50 rounded-xl p-6">
              <Fish className="w-8 h-8 text-orange-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Fishing Secret</h3>
              <p className="text-gray-600 text-sm">
                Book morning charters for better catches and calmer waters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Gulf Coast Adventure?</h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Start with a charter fishing trip for the authentic Alabama Gulf Coast experience, 
            then explore the beaches, dining, and attractions that make this region special.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-teal-600 hover:bg-teal-50">
              <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                Book Your Fishing Trip First
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-teal-600">
              <Link href="/vacation-rental-checklist">
                Get Your Vacation Checklist
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <WTVFooter />
    </div>
  );
}
