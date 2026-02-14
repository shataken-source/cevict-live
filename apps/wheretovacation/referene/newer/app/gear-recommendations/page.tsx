import Navigation from '@/components/Navigation';
import WTVFooter from '@/components/WTVFooter';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Smartphone, 
  Heart, 
  Package, 
  Star, 
  CheckCircle, 
  Truck, 
  AlertTriangle,
  Anchor,
  ExternalLink,
  DollarSign,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function GearRecommendationsPage() {
  const professionalGear = [
    {
      category: "Professional Boat Use",
      icon: Shield,
      color: "from-blue-500 to-cyan-500",
      items: [
        {
          name: "Breakwater Supply Waterproof Marine First Aid Kit",
          price: "$24.95",
          rating: 5.0,
          reviews: 42,
          image: "/api/placeholder/300/200",
          description: "Essential for GCC - Professional safety standard with 100% waterproof 2L dry bag",
          keyFeature: "2L Waterproof Dry Bag",
          bestFor: "Charter Safety (GCC)",
          pros: [
            "100% waterproof dry bag keeps medical supplies dry in rough seas",
            "Professional marine-grade first aid supplies",
            "Compact and easily accessible on boat",
            "Major trust signal for families booking charters",
            "USCG-compliant safety equipment"
          ],
          cons: [
            "Higher initial cost than basic kits"
          ],
          affiliateLink: "https://amazon.com/breakwater-marine-first-aid",
          whyRecommended: "Having this visible on the boat shows you prioritize safety and professionalism - a key differentiator from smaller charters.",
          amazonPrime: true
        },
        {
          name: "Pelican Marine Waterproof Floating Pouch",
          price: "$25.00",
          rating: 4.6,
          reviews: 49,
          image: "/api/placeholder/300/200",
          description: "Vacation saver for guests - IP68 rating with built-in air cushions for floating",
          keyFeature: "Floating Design; IP68",
          bestFor: "Guest Tech (WTV)",
          pros: [
            "IP68 rating means complete waterproof protection",
            "Built-in air cushions ensure phone floats if dropped",
            "Crystal clear touch screen compatibility",
            "Essential for vacation photos on the water",
            "Compact and travel-friendly design"
          ],
          cons: [
            "Slightly bulkier than basic phone cases"
          ],
          affiliateLink: "https://amazon.com/pelican-marine-floating-pouch",
          whyRecommended: "Prevents the 'phone in the ocean' disaster that ruins vacation memories. A must-have recommendation for beach and boat activities.",
          amazonPrime: true
        },
        {
          name: "Band-Aid Travel Ready First Aid Kit",
          price: "$10.98",
          rating: 4.5,
          reviews: 207,
          image: "/api/placeholder/300/200",
          description: "Perfect beach bag essential - 80-piece compact travel kit",
          keyFeature: "80-Piece; Travel-Sized",
          bestFor: "Beach Essentials (WTV)",
          pros: [
            "80 essential items in compact travel size",
            "Perfect for beach bags and day trips",
            "Budget-friendly option for families",
            "Includes vacation-specific items (blister care, etc.)",
            "Trusted Band-Aid brand quality"
          ],
          cons: [
            "Not waterproof - best for beach use only"
          ],
          affiliateLink: "https://amazon.com/band-aid-travel-first-aid",
          whyRecommended: "Great budget-friendly recommendation that covers all basic vacation needs. Perfect for families who want comprehensive coverage without the marine-grade price.",
          amazonPrime: true
        }
      ]
    },
    {
      category: "Family Beach Essentials",
      icon: Heart,
      color: "from-pink-500 to-rose-500",
      items: [
        {
          name: "Band-Aid Travel Ready First Aid Kit",
          price: "$10.98",
          rating: 4.5,
          reviews: 207,
          keyFeature: "80 items; travel-sized",
          bestFor: "Family beach bag",
          description: "Compact first aid kit with 80 essential items perfect for minor scrapes and beach emergencies.",
          pros: [
            "Compact and portable",
            "80 essential items",
            "Travel-friendly size",
            "Johnson & Johnson quality"
          ],
          whyRecommended: "Essential for families with kids - beach injuries are common and this kit has everything needed",
          link: "https://www.amazon.com/Band-Aid-Travel-Ready-First-Aid/dp/B08XYZ789"
        },
        {
          name: "Body Glove Tidal Waterproof Floating Phone Pouch",
          price: "$9.88",
          rating: 4.9,
          reviews: 26,
          keyFeature: "Fits large phones; floats",
          bestFor: "Budget phone protection",
          description: "Affordable waterproof phone pouch that fits phones up to 6.9 inches and floats if dropped.",
          pros: [
            "Great value price",
            "Fits large phones",
            "Floats reliably",
            "Clear window for photos"
          ],
          whyRecommended: "Budget-friendly option that provides essential protection for beach and water activities",
          link: "https://www.amazon.com/Body-Glove-Tidal-Waterproof-Floating/dp/B08XYZ012"
        },
        {
          name: "Case-Mate Waterproof Floating Pouch",
          price: "$18.59",
          rating: 4.2,
          reviews: 287,
          keyFeature: "Premium build quality",
          bestFor: "Beach vacation",
          description: "Mid-range waterproof pouch with excellent build quality and reliable floating capability.",
          pros: [
            "Premium construction",
            "Reliable floating",
            "Good touchscreen response",
            "Durable materials"
          ],
          whyRecommended: "Good balance of price and quality for vacationers who want reliable protection",
          link: "https://www.amazon.com/Case-Mate-Waterproof-Floating-Pouch/dp/B08XYZ345"
        }
      ]
    }
  ];

  const comparisonTable = [
    {
      product: "Breakwater Supply First Aid Kit",
      bestFor: "Professional Boat Use",
      keyFeature: "Waterproof 2L dry bag",
      price: "$24.95",
      rating: 4.2,
      professional: true,
      family: false
    },
    {
      product: "Pelican Marine Pouch",
      bestFor: "Maximum Phone Protection",
      keyFeature: "IP68 rated; air cushions",
      price: "$25.00",
      rating: 4.6,
      professional: true,
      family: true
    },
    {
      product: "Band-Aid Travel Kit",
      bestFor: "Family Beach Bag",
      keyFeature: "80 items; travel-sized",
      price: "$10.98",
      rating: 4.5,
      professional: false,
      family: true
    },
    {
      product: "Body Glove Tidal Pouch",
      bestFor: "Budget Phone Protection",
      keyFeature: "Fits large phones; floats",
      price: "$9.88",
      rating: 4.9,
      professional: false,
      family: true
    }
  ];

  const buyingTips = [
    {
      title: "For Charter Businesses",
      tips: [
        "Invest in professional-grade first aid kits for liability protection",
        "Phone protection shows clients you value their property",
        "Keep spare waterproof pouches for forgetful clients",
        "Professional gear builds trust and justifies premium pricing"
      ]
    },
    {
      title: "For Vacationers",
      tips: [
        "Always pack a first aid kit - beach injuries are common",
        "Test waterproof pouches before your trip with paper towels",
        "Bring backup phone protection options",
        "Consider waterproof cases for expensive phones"
      ]
    },
    {
      title: "Budget Considerations",
      tips: [
        "Body Glove Tidal offers the best value for phone protection",
        "Band-Aid kit is essential and affordable",
        "Professional gear pays for itself in charter business",
        "Buy in bulk for multiple family members"
      ]
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
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Curated Gear Recommendations</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Professional-grade equipment for charter businesses and essential gear for 
              vacationers. Hand-picked by Gulf Coast experts for maximum safety and enjoyment.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Shield className="w-4 h-4" />
                <span>Professional Grade</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span>Expert Tested</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <DollarSign className="w-4 h-4" />
                <span>Best Value</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Comparison */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Comparison</h2>
            <p className="text-xl text-gray-600">
              Find the right gear for your needs
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Best For
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key Feature
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Use Case
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comparisonTable.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.bestFor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.keyFeature}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="ml-1">{item.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.professional && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs mr-1">
                          Professional
                        </span>
                      )}
                      {item.family && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          Family
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      {professionalGear.map((category, index) => {
        const Icon = category.icon;
        return (
          <section key={index} className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{category.category}</h2>
                <p className="text-xl text-gray-600">
                  Expert-recommended gear for maximum safety and enjoyment
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="font-bold text-lg text-blue-600">{item.price}</span>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="ml-1">{item.rating}</span>
                              <span className="text-gray-400">({item.reviews})</span>
                            </div>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {item.bestFor}
                        </span>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-900 mb-1">Key Feature:</p>
                        <p className="text-sm text-gray-600">{item.keyFeature}</p>
                      </div>

                      <p className="text-gray-600 mb-4">{item.description}</p>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">Why We Recommend:</p>
                        <p className="text-sm text-blue-700">{item.whyRecommended}</p>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">Pros:</p>
                        <ul className="space-y-1">
                          {item.pros.map((pro, proIndex) => (
                            <li key={proIndex} className="flex items-center gap-2 text-sm text-gray-600">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button asChild className="w-full">
                        <Link href={item.link} target="_blank" rel="noopener noreferrer">
                          View on Amazon
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Buying Tips */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Expert Buying Tips</h2>
            <p className="text-xl text-gray-600">
              Make informed decisions with our expert advice
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {buyingTips.map((section, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
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
            <h2 className="text-3xl font-bold mb-4">Ready to Test Your Gear?</h2>
            <p className="text-xl text-blue-100">
              Book a charter trip to try out your new equipment on the beautiful Gulf Coast!
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Professional Charter Experience</h3>
              <p className="text-blue-100 mb-4">
                Test your gear with our expert captains who provide all safety equipment and professional guidance.
              </p>
              <Button asChild className="w-full bg-white text-blue-600 hover:bg-blue-50">
                <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                  Book a Charter
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Complete Vacation Planning</h3>
              <p className="text-blue-100 mb-4">
                Get our complete vacation checklist and rainy day backup plans for the perfect Gulf Coast trip.
              </p>
              <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/vacation-rental-checklist">
                  Vacation Checklist
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
