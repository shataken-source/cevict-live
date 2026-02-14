import Navigation from '@/components/Navigation';
import WTVFooter from '@/components/WTVFooter';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Users, 
  DollarSign, 
  Car, 
  Utensils, 
  Waves, 
  CheckCircle, 
  XCircle,
  Star,
  Anchor,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function BeachComparisonPage() {
  const comparisonData = [
    {
      category: "Beach Access & Walking",
      gulfShores: {
        rating: "Excellent",
        details: "Beachfront condos and hotels, walk to everything",
        pros: ["Walk to dinner", "Beachfront bars", "Public beach access", "Trolley service"],
        cons: ["Crowded beaches", "Higher prices", "Parking challenges"]
      },
      orangeBeach: {
        rating: "Good",
        details: "More spread out, need car for most destinations",
        pros: ["Less crowded", "Newer developments", "Better parking", "Quieter beaches"],
        cons: ["Must drive to dinner", "Fewer beachfront bars", "More residential"]
      }
    },
    {
      category: "Dining & Nightlife",
      gulfShores: {
        rating: "Excellent",
        details: "Walkable dining scene with lots of options",
        pros: ["50+ restaurants walking distance", "Beachfront bars", "Live music venues", "Food trucks"],
        cons: ["Tourist pricing", "Long waits in season", "Crowded popular spots"]
      },
      orangeBeach: {
        rating: "Good",
        details: "Upscale dining, requires driving but worth it",
        pros: ["Higher quality restaurants", "Less crowded", "The Wharf entertainment", "Fresh seafood markets"],
        cons: ["Must drive everywhere", "Fewer casual spots", "Limited nightlife"]
      }
    },
    {
      category: "Boating & Fishing",
      gulfShores: {
        rating: "Good",
        details: "Good access but more crowded marinas",
        pros: ["Multiple marinas", "Beach fishing", "Pier fishing", "Boat rentals"],
        cons: ["Crowded boat launches", "Limited parking", "Tourist-focused charters"]
      },
      orangeBeach: {
        rating: "Excellent",
        details: "Premier boating destination with better facilities",
        pros: ["State-of-the-art marina", "Professional charters", "Less crowded waters", "Better boat ramps"],
        cons: ["Higher charter prices", "More serious fishing focus"]
      }
    },
    {
      category: "Family Activities",
      gulfShores: {
        rating: "Excellent",
        details: "More family-friendly attractions and activities",
        pros: ["Gulf State Park", "The Zoo", "Mini golf courses", "Waterville USA", "Adventure Island"],
        cons: ["More crowded attractions", "Tourist pricing"]
      },
      orangeBeach: {
        rating: "Good",
        details: "Focus on water activities and quieter family fun",
        pros: ["Coastal Arts Center", "Less crowded beaches", "The Wharf", "Water sports", "Nature trails"],
        cons: ["Fewer dedicated kid attractions", "More spread out"]
      }
    },
    {
      category: "Cost & Value",
      gulfShores: {
        rating: "Fair",
        details: "Higher prices but more convenience",
        pros: ["More budget options", "Free activities", "Public transportation", "Competition keeps prices competitive"],
        cons: ["Tourist pricing premium", "Peak season rates", "Resort fees"]
      },
      orangeBeach: {
        rating: "Good",
        details: "Better value for money, less tourist markup",
        pros: ["Better vacation deals", "Less tourist pricing", "Free parking", "Higher quality for price"],
        cons: ["Fewer budget options", "Higher-end focus", "Minimum stays required"]
      }
    },
    {
      category: "Atmosphere & Vibe",
      gulfShores: {
        rating: "Lively",
        details: "Busy, energetic, classic beach town feel",
        pros: ["Always something happening", "People watching", "Beach parties", "Spring break destination"],
        cons: ["Can be overwhelming", "Noise and crowds", "Less relaxing"]
      },
      orangeBeach: {
        rating: "Relaxed",
        details: "Upscale, quieter, more sophisticated",
        pros: ["Peaceful beaches", "Clean and modern", "Good for relaxation", "Less noise"],
        cons: ["Quieter nightlife", "Less spontaneous fun", "More formal atmosphere"]
      }
    }
  ];

  const quickRecommendations = [
    {
      group: "Families with Young Kids",
      winner: "Gulf Shores",
      reason: "More kid-friendly activities, walking distance to everything, easier to manage with little ones",
      bestFor: "Convenience, variety of activities, beachfront access"
    },
    {
      group: "Couples & Romance",
      winner: "Orange Beach",
      reason: "Quieter beaches, upscale dining, more sophisticated atmosphere, better for relaxation",
      bestFor: "Romantic dinners, peaceful beaches, quality time"
    },
    {
      group: "Serious Fishermen",
      winner: "Orange Beach",
      reason: "Better marinas, professional charters, less crowded waters, serious fishing culture",
      bestFor: "Charter fishing, boat access, serious angling"
    },
    {
      group: "Spring Break / Party Groups",
      winner: "Gulf Shores",
      reason: "More bars, nightlife, beach parties, younger crowd, more action",
      bestFor: "Nightlife, beach parties, social scene"
    },
    {
      group: "Budget-Conscious Travelers",
      winner: "Gulf Shores",
      reason: "More budget options, free activities, competition keeps prices lower, less expensive overall",
      bestFor: "Saving money, free entertainment, budget dining"
    },
    {
      group: "Luxury Seekers",
      winner: "Orange Beach",
      reason: "Higher-end properties, better amenities, less crowded, more sophisticated experience",
      bestFor: "High-end rentals, quality dining, peaceful luxury"
    }
  ];

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "Excellent": return "text-green-600";
      case "Good": return "text-blue-600";
      case "Fair": return "text-yellow-600";
      case "Lively": return "text-purple-600";
      case "Relaxed": return "text-teal-600";
      default: return "text-gray-600";
    }
  };

  const getRatingBg = (rating: string) => {
    switch (rating) {
      case "Excellent": return "bg-green-100";
      case "Good": return "bg-blue-100";
      case "Fair": return "bg-yellow-100";
      case "Lively": return "bg-purple-100";
      case "Relaxed": return "bg-teal-100";
      default: return "bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Gulf Shores vs. Orange Beach: Which is Right for You?</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Two amazing Gulf Coast destinations, each with its own personality. Let us help you choose 
              the perfect spot for your vacation style and budget.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Star className="w-4 h-4" />
                <span>Side-by-Side Comparison</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Users className="w-4 h-4" />
                <span>Group-Specific Recommendations</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <DollarSign className="w-4 h-4" />
                <span>Cost & Value Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Recommendations */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Recommendations</h2>
            <p className="text-xl text-gray-600">
              Don't want to read the details? Here's who should go where
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickRecommendations.map((rec, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{rec.group}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    rec.winner === "Gulf Shores" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {rec.winner}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{rec.reason}</p>
                <div className="text-sm">
                  <span className="font-medium text-gray-900">Best for:</span>
                  <span className="text-gray-600 ml-1">{rec.bestFor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Comparison */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Detailed Comparison</h2>
            <p className="text-xl text-gray-600">
              Everything you need to know to make the right choice
            </p>
          </div>
          
          <div className="space-y-8">
            {comparisonData.map((category, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                  <h3 className="text-xl font-bold">{category.category}</h3>
                </div>
                
                <div className="grid md:grid-cols-2">
                  {/* Gulf Shores */}
                  <div className="p-6 border-r border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">Gulf Shores</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingBg(category.gulfShores.rating)} ${getRatingColor(category.gulfShores.rating)}`}>
                        {category.gulfShores.rating}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{category.gulfShores.details}</p>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-green-600 mb-2">Pros:</p>
                      <ul className="space-y-1">
                        {category.gulfShores.pros.map((pro, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-red-600 mb-2">Cons:</p>
                      <ul className="space-y-1">
                        {category.gulfShores.cons.map((con, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Orange Beach */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">Orange Beach</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingBg(category.orangeBeach.rating)} ${getRatingColor(category.orangeBeach.rating)}`}>
                        {category.orangeBeach.rating}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{category.orangeBeach.details}</p>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-green-600 mb-2">Pros:</p>
                      <ul className="space-y-1">
                        {category.orangeBeach.pros.map((pro, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-red-600 mb-2">Cons:</p>
                      <ul className="space-y-1">
                        {category.orangeBeach.cons.map((con, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Summary Table */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">At a Glance</h2>
            <p className="text-xl text-gray-600">
              Quick reference for your decision
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gulf Shores
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orange Beach
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Best For
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Walking to Dinner
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-600">✓ Excellent</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-yellow-600">✗ Must Drive</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Families, Couples who want convenience
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Boating & Fishing
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-blue-600">✓ Good</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-600">✓ Excellent</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Serious fishermen, boat owners
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Nightlife
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-600">✓ Lively</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-blue-600">✓ Quiet</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Spring break, party groups
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Family Activities
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-600">✓ Excellent</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-blue-600">✓ Good</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Families with young kids
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Budget-Friendly
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-yellow-600">✓ Fair</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-blue-600">✓ Good</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Budget-conscious travelers
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Peace & Quiet
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-red-600">✗ Crowded</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-600">✓ Relaxing</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Couples, relaxation seekers
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cross-Promotion */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Anchor className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Experience the Best of Both?</h2>
            <p className="text-xl text-blue-100">
              No matter which beach you choose, we can help you experience the best Gulf Coast fishing!
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Gulf Shores Fishing Adventures</h3>
              <p className="text-blue-100 mb-4">
                Beach fishing, pier fishing, and nearshore charters perfect for families and casual anglers.
              </p>
              <Button asChild className="w-full bg-white text-blue-600 hover:bg-blue-50">
                <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                  Book Gulf Shores Charter
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Orange Beach Professional Charters</h3>
              <p className="text-blue-100 mb-4">
                Serious offshore fishing, state-of-the-art marina, and professional fishing experiences.
              </p>
              <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                  Book Orange Beach Charter
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
