import Navigation from '@/components/Navigation';
import WTVFooter from '@/components/WTVFooter';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Star, 
  Users, 
  Clock, 
  DollarSign, 
  Heart, 
  Coffee,
  Utensils,
  Anchor,
  ExternalLink,
  Shield
} from 'lucide-react';
import Link from 'next/link';

export default function WhereLocalsGoPage() {
  const localSpots = [
    {
      name: "Sassy Bass",
      category: "Dining",
      location: "Orange Beach, AL",
      description: "Hidden gem on the Intracoastal Waterway with fresh seafood and live music. Locals come for the grouper sandwiches and sunset views.",
      whyLocal: "No tourist crowds, authentic Gulf Coast atmosphere, prices 30% lower than beachfront restaurants",
      specialties: ["Blackened Grouper", "Oyster Po' Boys", "Local Craft Beer"],
      priceRange: "$12-25 per entree",
      bestTime: "Sunset (5-7 PM)",
      localTip: "Sit on the deck - best sunset views on the island and no wait times!",
      distance: "10 min from main beaches",
      parking: "Free lot, never full"
    },
    {
      name: "Tin Top Restaurant",
      category: "Dining",
      location: "Bon Secour, AL",
      description: "Family-owned since 1985, serving fresh Gulf seafood in a converted gas station. The fried shrimp are legendary.",
      whyLocal: "Authentic dive atmosphere, seafood caught daily, prices haven't changed in years",
      specialties: ["Fried Shrimp Basket", "Crab Cakes", "Homemade Key Lime Pie"],
      priceRange: "$8-18 per entree",
      bestTime: "Lunch (11 AM - 2 PM)",
      localTip: "Get the shrimp basket - it's the same recipe they've used for 35+ years",
      distance: "15 min from Gulf Shores",
      parking: "Free, plenty of space"
    },
    {
      name: "Wolf Bay Lodge",
      category: "Dining",
      location: "Elberta, AL",
      description: "Historic lodge on Wolf Bay with incredible seafood and Southern hospitality. The fried crab claws are a must-try.",
      whyLocal: "Been serving locals since 1948, portions are huge, prices are pre-tourism boom",
      specialties: ["Fried Crab Claws", "Wolf Bay Oysters", "Southern Fried Catfish"],
      priceRange: "$15-30 per entree",
      bestTime: "Dinner (5-8 PM)",
      localTip: "Ask for the 'local special' - it's not on the menu but it's what regulars order",
      distance: "20 min from Orange Beach",
      parking: "Free lot"
    },
    {
      name: "Pineapple Willy's",
      category: "Dining",
      location: "Fort Morgan, AL",
      description: "Beachfront bar that locals love for the relaxed vibe and incredible sunsets. No tourist traps here!",
      whyLocal: "Real beach bar atmosphere, drinks are strong, food is actually good (not just bar food)",
      specialties: ["Pineapple Willy's Burger", "Fresh Grouper Sandwich", "Frozen Drinks"],
      priceRange: "$10-22 per entree",
      bestTime: "Late afternoon (3-6 PM)",
      localTip: "Go on weekdays - you'll have the place almost to yourself",
      distance: "25 min from Gulf Shores",
      parking: "Free beach parking"
    },
    {
      name: "The Steamer",
      category: "Seafood Market",
      location: "Gulf Shores, AL",
      description: "Local seafood market where the restaurants buy their fish. You can get fresh-off-the-boat seafood at wholesale prices.",
      whyLocal: "Same fish as expensive restaurants, half the price, you know it's fresh",
      specialties: ["Fresh Gulf Shrimp", "Red Snapper", "Oysters", "Crab"],
      priceRange: "Wholesale prices",
      bestTime: "Early morning (7-9 AM)",
      localTip: "Call ahead to see what came in that day - the selection changes daily",
      distance: "5 min from main beaches",
      parking: "Free, easy access"
    },
    {
      name: "Cotton Creek BBQ",
      category: "Dining",
      location: "Foley, AL",
      description: "Hidden BBQ joint that locals drive 30 minutes for. The ribs fall off the bone and the sides are homemade.",
      whyLocal: "Authentic Alabama BBQ, no tourist markup, portions feed a family",
      specialties: ["Pork Ribs", "Brisket", "Homemade Mac & Cheese", "Banana Pudding"],
      priceRange: "$12-20 per plate",
      bestTime: "Lunch (11 AM - 3 PM)",
      localTip: "Get the combo plate - enough food for two meals and you'll taste everything",
      distance: "20 min from beaches",
      parking: "Free lot"
    }
  ];

  const localRules = [
    {
      title: "Timing is Everything",
      description: "Locals eat early (5-6 PM) or late (8-9 PM) to avoid tourist rushes. Lunch is always less crowded than dinner.",
      icon: Clock
    },
    {
      title: "Cash Still Talks",
      description: "Many local spots prefer cash and some even give discounts for it. Always have some on hand.",
      icon: DollarSign
    },
    {
      title: "Dress Code: Beach Casual",
      description: "No need for fancy clothes - locals come straight from the beach. Flip-flops are always welcome.",
      icon: Users
    },
    {
      title: "Talk to the Staff",
      description: "Local servers know what's actually good today, not just what's on the menu. Ask for recommendations!",
      icon: Heart
    }
  ];

  const touristTraps = [
    {
      trap: "Beachfront Restaurants with 'View Pricing'",
      reality: "Same food as local spots, 50% markup for the view. Eat at local places, then walk to the beach.",
      savings: "Save $30-50 per meal"
    },
    {
      trap: "Tourist T-Shirt Shops",
      reality: "Same shirts at Walmart for 75% less. Buy souvenirs at local shops or wait until you get home.",
      savings: "Save $20-40 per shirt"
    },
    {
      trap: "Beach Equipment Rentals",
      reality: "Local shops have better gear and lower prices. Many hotels offer free equipment.",
      savings: "Save $15-30 per day"
    },
    {
      trap: "Paid Parking Lots",
      reality: "Free street parking is available within 2-3 blocks of most beaches. Arrive 10 minutes early.",
      savings: "Save $10-25 per day"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-teal-600 to-green-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Where the Locals Go</h1>
            <p className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto">
              Skip the tourist traps and discover the authentic Gulf Coast. These are the spots 
              where locals actually eat, drink, and hang out - better food, better prices, no crowds.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Shield className="w-4 h-4" />
                <span>Tourist-Trap Free</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <DollarSign className="w-4 h-4" />
                <span>Local Prices</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Star className="w-4 h-4" />
                <span>Authentic Experiences</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Local Rules */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Local Rules of Thumb</h2>
            <p className="text-xl text-gray-600">
              How to eat and vacation like a true Gulf Coast local
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {localRules.map((rule, index) => {
              const Icon = rule.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{rule.title}</h3>
                  <p className="text-gray-600 text-sm">{rule.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tourist Traps to Avoid */}
      <section className="py-12 bg-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-red-800 mb-4">Tourist Traps to Avoid</h2>
            <p className="text-xl text-red-600">
              Save money and get better experiences by skipping these
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {touristTraps.map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-red-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">!</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-800 mb-2">{item.trap}</h3>
                    <p className="text-gray-600 mb-3">{item.reality}</p>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium inline-block">
                      {item.savings}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Local Spots */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Authentic Local Spots</h2>
            <p className="text-xl text-gray-600">
              These are the places where Gulf Coast locals actually spend their time and money
            </p>
          </div>
          
          <div className="space-y-8">
            {localSpots.map((spot, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Utensils className="w-6 h-6 text-teal-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{spot.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs">
                              {spot.category}
                            </span>
                            <MapPin className="w-4 h-4" />
                            <span>{spot.location}</span>
                            <DollarSign className="w-4 h-4" />
                            <span>{spot.priceRange}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4">{spot.description}</p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Why Locals Love It:</p>
                          <p className="text-sm text-teal-700">{spot.whyLocal}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Best Time to Go:</p>
                          <p className="text-sm text-gray-600">{spot.bestTime}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Specialties:</p>
                          <div className="flex flex-wrap gap-1">
                            {spot.specialties.map((specialty, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Distance:</p>
                          <p className="text-sm text-gray-600">{spot.distance}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Parking:</p>
                          <p className="text-sm text-gray-600">{spot.parking}</p>
                        </div>
                      </div>

                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <Coffee className="w-5 h-5 text-teal-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-teal-800 mb-1">Local Insider Tip:</p>
                            <p className="text-sm text-teal-700">{spot.localTip}</p>
                          </div>
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
            <h2 className="text-3xl font-bold mb-4">Want to Catch Your Own Local Dinner?</h2>
            <p className="text-xl text-blue-100">
              Now that you know where the locals eat, let our professional captains show you where they fish!
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Local Fishing Spots</h3>
              <p className="text-blue-100 mb-4">
                Our captains know the secret spots where locals actually catch fish - not the tourist areas.
              </p>
              <Button asChild className="w-full bg-white text-blue-600 hover:bg-blue-50">
                <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                  Book Local Charter
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Cook Your Catch</h3>
              <p className="text-blue-100 mb-4">
                Many local restaurants will cook your fresh catch - bring it to Sassy Bass or Tin Top!
              </p>
              <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/local-guides/orange-beach-bait-ramps">
                  Find Bait Shops
                </Link>
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Live Catch Reports</h3>
              <p className="text-blue-100 mb-4">
                See what's biting right now with our live daily reports from local waters.
              </p>
              <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                  View Live Reports
                  <ExternalLink className="w-4 h-4 ml-2" />
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
