import Navigation from '@/components/Navigation';
import WTVFooter from '@/components/WTVFooter';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Phone, 
  Clock, 
  DollarSign, 
  Star, 
  Fish, 
  Anchor, 
  Truck, 
  Navigation as NavigationIcon,
  Users,
  TrendingUp,
  Coffee,
  Info,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function OrangeBeachBaitRampsPage() {
  const baitShops = [
    {
      name: "Sam's Bait & Tackle",
      rank: 1,
      address: "25201 Canal Rd, Orange Beach, AL 36561",
      phone: "(251) 981-4660",
      hours: "5:00 AM - 7:00 PM (Daily)",
      specialties: ["Live Shrimp", "Frozen Bait", "Tackle", "Ice"],
      waitTime: "5-10 min",
      insiderTip: "Arrive before 6 AM for zero wait time. They have the freshest live shrimp in the area.",
      prices: "Live Shrimp: $18/dozen, Frozen Bait: $6-12",
      parking: "Large lot, can handle trailers",
      rating: 4.8,
      distance: "2 min from Orange Beach Marina"
    },
    {
      name: "Orange Beach Marina Bait Shop",
      rank: 2,
      address: "27360 Marina Rd, Orange Beach, AL 36561",
      phone: "(251) 981-4665",
      hours: "5:30 AM - 6:00 PM (Daily)",
      specialties: ["Live Bait", "Fishing Licenses", "Snacks", "Ice"],
      waitTime: "10-15 min",
      insiderTip: "Located right at the marina - perfect if you're launching there. They sell fishing licenses on-site.",
      prices: "Live Shrimp: $20/dozen, Licenses: $14",
      parking: "Marina parking included",
      rating: 4.6,
      distance: "At Orange Beach Marina"
    },
    {
      name: "J&M Tackle",
      rank: 3,
      address: "25825 Perdido Beach Blvd, Orange Beach, AL 36561",
      phone: "(251) 981-6120",
      hours: "6:00 AM - 6:00 PM (Daily)",
      specialties: ["Premium Tackle", "Live Bait", "Rental Gear", "Expert Advice"],
      waitTime: "5-10 min",
      insiderTip: "Staff are former charter captains - ask for advice on what's biting!",
      prices: "Live Shrimp: $19/dozen, Premium Tackle: $15-50",
      parking: "Medium lot, can get busy",
      rating: 4.7,
      distance: "5 min from main beaches"
    }
  ];

  const boatRamps = [
    {
      name: "Orange Beach Marina Boat Launch",
      rank: 1,
      address: "27360 Marina Rd, Orange Beach, AL 36561",
      lanes: 4,
      parking: "50+ trailer spots",
      fee: "$10 per launch",
      hours: "5:00 AM - 10:00 PM",
      waitTime: "5-15 min (peak season)",
      insiderTip: "Best ramp in the area - well-maintained, deep water, easy access. Arrive before 6 AM in summer.",
      features: ["Restrooms", "Bait shop on-site", "Fuel dock", "Marina services"],
      rating: 4.9,
      distance: "Central location"
    },
    {
      name: "Cotton Bayou Boat Launch",
      rank: 2,
      address: "23559 Canal Rd, Orange Beach, AL 36561",
      lanes: 2,
      parking: "30 trailer spots",
      fee: "$5 per launch",
      hours: "6:00 AM - 8:00 PM",
      waitTime: "10-20 min (peak)",
      insiderTip: "Cheapest option but gets crowded. Launch before 7 AM or after 5 PM for shortest waits.",
      features: ["Restrooms", "Fish cleaning station", "Covered waiting area"],
      rating: 4.3,
      distance: "3 min from main beaches"
    },
    {
      name: "Wolf Bay Boat Launch",
      rank: 3,
      address: "24059 Wolf Bay Dr, Orange Beach, AL 36561",
      lanes: 2,
      parking: "25 trailer spots",
      fee: "Free",
      hours: "Dawn to dusk",
      waitTime: "5-10 min",
      insiderTip: "Free launch but limited parking. Great for smaller boats. Calmer waters for beginners.",
      features: ["Restrooms", "Picnic area", "Fishing pier"],
      rating: 4.1,
      distance: "8 min from main beaches"
    }
  ];

  const timeStrategies = [
    {
      time: "5:00 AM - 6:00 AM",
      description: "Golden Hour",
      waitTime: "0-5 minutes",
      bestFor: "Serious anglers, early charters",
      tip: "All shops open, no crowds, best bait selection"
    },
    {
      time: "6:00 AM - 8:00 AM",
      description: "Local Hour",
      waitTime: "5-10 minutes",
      bestFor: "Most fishermen, families",
      tip: "Still manageable crowds, good service"
    },
    {
      time: "8:00 AM - 12:00 PM",
      description: "Tourist Rush",
      waitTime: "15-30 minutes",
      bestFor: "Vacationers, casual trips",
      tip: "Expect longer waits, consider alternative shops"
    },
    {
      time: "12:00 PM - 4:00 PM",
      description: "Afternoon Lull",
      waitTime: "5-15 minutes",
      bestFor: "Afternoon fishing, bait restock",
      tip: "Good balance of availability and service"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <Fish className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Orange Beach Bait & Boat Ramps</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Local's guide to the best bait shops and boat launches with the shortest lines. 
              Skip the tourist traps and fish like a local with our insider knowledge.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <TrendingUp className="w-4 h-4" />
                <span>Real-time Wait Times</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Clock className="w-4 h-4" />
                <span>Best Times to Go</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Star className="w-4 h-4" />
                <span>Local Rated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-blue-600">3</p>
              <p className="text-gray-600">Top Bait Shops Ranked</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">3</p>
              <p className="text-gray-600">Best Boat Ramps</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">5 AM</p>
              <p className="text-gray-600">Optimal Arrival Time</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-600">15 min</p>
              <p className="text-gray-600">Max Wait Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Time Strategy */}
      <section className="py-12 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Beat the Crowds: Time Strategy</h2>
            <p className="text-xl text-gray-600">
              Local's guide to the best times to hit the bait shops and boat ramps
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {timeStrategies.map((strategy, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{strategy.time}</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {strategy.waitTime}
                  </span>
                </div>
                <p className="text-sm font-medium text-blue-600 mb-2">{strategy.description}</p>
                <p className="text-sm text-gray-600 mb-3">Best for: {strategy.bestFor}</p>
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <Coffee className="w-4 h-4 inline mr-1" />
                    {strategy.tip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bait Shops */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Top Bait Shops</h2>
            <p className="text-xl text-gray-600">
              Ranked by locals for quality, price, and wait times
            </p>
          </div>
          
          <div className="space-y-6">
            {baitShops.map((shop, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {shop.rank}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{shop.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{shop.address}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            <span>{shop.phone}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{shop.hours}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>Wait: {shop.waitTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span>{shop.rating}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Distance from beaches</p>
                        <p className="font-medium text-gray-900">{shop.distance}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Specialties:</p>
                        <div className="flex flex-wrap gap-1">
                          {shop.specialties.map((specialty, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Price Range:</p>
                        <p className="text-sm text-gray-600">{shop.prices}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Parking:</p>
                        <p className="text-sm text-gray-600">{shop.parking}</p>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-800 mb-1">Local Insider Tip:</p>
                          <p className="text-sm text-green-700">{shop.insiderTip}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Boat Ramps */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Best Boat Ramps</h2>
            <p className="text-xl text-gray-600">
              Ranked by locals for ease of use, parking, and wait times
            </p>
          </div>
          
          <div className="space-y-6">
            {boatRamps.map((ramp, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {ramp.rank}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{ramp.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{ramp.address}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Truck className="w-4 h-4" />
                            <span>{ramp.lanes} lanes</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{ramp.hours}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>Wait: {ramp.waitTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>{ramp.fee}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span>{ramp.rating}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Parking</p>
                        <p className="font-medium text-gray-900">{ramp.parking}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {ramp.features.map((feature, idx) => (
                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Navigation className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-1">Boater's Tip:</p>
                          <p className="text-sm text-blue-700">{ramp.insiderTip}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Promotion */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Anchor className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Catch Your Own Dinner?</h2>
            <p className="text-xl text-blue-100">
              Now that you know where to get bait and launch your boat, let our professional captains 
              show you the best fishing spots!
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">No Boat? No Problem!</h3>
              <p className="text-blue-100 mb-4">
                Our charter boats include all bait, tackle, and licenses. Just show up and fish!
              </p>
              <Button asChild className="w-full bg-white text-blue-600 hover:bg-blue-50">
                <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                  Book a Charter
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Local Fishing Reports</h3>
              <p className="text-blue-100 mb-4">
                See what's biting right now with our live catch reports from today's trips.
              </p>
              <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                  Live Catch Reports
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">What to Bring</h3>
              <p className="text-blue-100 mb-4">
                Check our complete packing list for the perfect day on the water.
              </p>
              <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/vacation-rental-checklist">
                  Packing List
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <WTVFooter />
    </div>
  );
}
