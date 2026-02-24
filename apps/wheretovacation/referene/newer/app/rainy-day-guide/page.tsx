import Navigation from '@/components/Navigation';
import WTVFooter from '@/components/WTVFooter';
import { Button } from '@/components/ui/button';
import { 
  CloudRain, 
  Umbrella, 
  Building, 
  Utensils, 
  ShoppingBag, 
  Film, 
  Gamepad2, 
  Book, 
  Music, 
  Coffee,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Star,
  Anchor,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function RainyDayGuidePage() {
  const activities = [
    {
      category: "Indoor Attractions",
      icon: Building,
      color: "from-purple-500 to-pink-500",
      items: [
        {
          name: "USS Alabama Battleship Memorial Park",
          description: "Explore the historic WWII battleship and submarine. Perfect for history buffs and families.",
          location: "Mobile, AL (45 min from Gulf Shores)",
          cost: "$15-20 per person",
          duration: "2-3 hours",
          goodFor: "Families, History Lovers",
          localTip: "Go on a weekday for smaller crowds. The submarine tour is a must-do!"
        },
        {
          name: "Coastal Arts Center of Orange Beach",
          description: "Beautiful art gallery with rotating exhibitions and hands-on workshops for all ages.",
          location: "Orange Beach, AL",
          cost: "Free admission, workshops $10-30",
          duration: "1-2 hours",
          goodFor: "Art Lovers, Families",
          localTip: "Check their schedule for pottery classes - great for rainy day creativity!"
        },
        {
          name: "The Wharf Entertainment District",
          description: "Indoor shopping, dining, and entertainment complex with ferris wheel (covered pods).",
          location: "Orange Beach, AL",
          cost: "Free to enter, activities vary",
          duration: "2-4 hours",
          goodFor: "Everyone",
          localTip: "The ferris wheel has enclosed pods - perfect for rainy day views!"
        }
      ]
    },
    {
      category: "Family Fun Centers",
      icon: Gamepad2,
      color: "from-blue-500 to-cyan-500",
      items: [
        {
          name: "The Track Family Recreation Center",
          description: "Indoor arcade, bumper cars, and mini golf. Multiple locations along the coast.",
          location: "Gulf Shores & Orange Beach, AL",
          cost: "$20-40 per person",
          duration: "2-3 hours",
          goodFor: "Families with Kids",
          localTip: "Buy the unlimited wristband - it's cheaper if you plan to stay awhile!"
        },
        {
          name: "Fat Daddy's Arcade",
          description: "Classic beach arcade with modern games and redemption prizes. Right on the beach!",
          location: "Gulf Shores, AL",
          cost: "$10-25 per person",
          duration: "1-2 hours",
          goodFor: "All Ages",
          localTip: "Go right when they open (10 AM) for the best machine selection!"
        },
        {
          name: "Zooland Mini Golf",
          description: "Indoor mini golf with exotic animal themes and interactive exhibits.",
          location: "Gulf Shores, AL",
          cost: "$12-15 per person",
          duration: "1-2 hours",
          goodFor: "Families",
          localTip: "Combine with a visit to the nearby Alligator Alley for a full day!"
        }
      ]
    },
    {
      category: "Dining Experiences",
      icon: Utensils,
      color: "from-orange-500 to-red-500",
      items: [
        {
          name: "LuLu's Restaurant",
          description: "Massive indoor/outdoor restaurant with live music, sand play area, and arcade.",
          location: "Gulf Shores, AL",
          cost: "$15-30 per person",
          duration: "1-3 hours",
          goodFor: "Families, Groups",
          localTip: "The hurricane simulator is a fun rainy day activity - ask about it!"
        },
        {
          name: "The Hangout",
          description: "Beach-themed restaurant with indoor entertainment, live music, and games.",
          location: "Gulf Shores, AL",
          cost: "$12-25 per person",
          duration: "1-2 hours",
          goodFor: "Everyone",
          localTip: "Try their tropical drinks - they're famous for them even on rainy days!"
        },
        {
          name: "Tacky Jacks 2",
          description: "Covered dining with great Gulf views and local seafood specialties.",
          location: "Orange Beach, AL",
          cost: "$15-30 per person",
          duration: "1-2 hours",
          goodFor: "Couples, Families",
          localTip: "Sit on the covered porch - you can watch the storm roll over the Gulf!"
        }
      ]
    },
    {
      category: "Shopping & Entertainment",
      icon: ShoppingBag,
      color: "from-green-500 to-emerald-500",
      items: [
        {
          name: "Tanger Outlets",
          description: "Covered outdoor shopping with covered walkways and 120+ brand-name stores.",
          location: "Foley, AL (25 min from beaches)",
          cost: "Varies by shopping",
          duration: "2-4 hours",
          goodFor: "Shoppers, Teens",
          localTip: "Check their website for rainy day specials - many stores offer discounts!"
        },
        {
          name: "Pelican Place Craft Brew",
          description: "Indoor shopping center with restaurants, brewery, and entertainment.",
          location: "Gulf Shores, AL",
          cost: "Free to browse",
          duration: "1-2 hours",
          goodFor: "Adults, Foodies",
          localTip: "The brewery offers tours on rainy afternoons - call ahead!"
        },
        {
          name: "Souvenir City",
          description: "Massive indoor souvenir superstore with everything Gulf Coast.",
          location: "Gulf Shores, AL",
          cost: "$5-50 per person",
          duration: "30 minutes - 1 hour",
          goodFor: "Everyone",
          localTip: "Great place to buy rainy day activities like puzzles and games!"
        }
      ]
    },
    {
      category: "Educational & Cultural",
      icon: Book,
      color: "from-indigo-500 to-purple-500",
      items: [
        {
          name: "Gulf Shores Museum",
          description: "Local history museum with exhibits on fishing, hurricanes, and coastal life.",
          location: "Gulf Shores, AL",
          cost: "Free admission",
          duration: "1 hour",
          goodFor: "History Buffs, Families",
          localTip: "The hurricane exhibit is fascinating - especially during a storm!"
        },
        {
          name: "Orange Beach History Museum",
          description: "Small but charming museum with local fishing heritage and Native American artifacts.",
          location: "Orange Beach, AL",
          cost: "Free admission",
          duration: "45 minutes - 1 hour",
          goodFor: "History Lovers",
          localTip: "Talk to the volunteers - they have amazing local stories!"
        },
        {
          name: "Weeks Bay National Estuarine Research Reserve",
          description: "Indoor interpretive center with aquariums and exhibits about local ecosystems.",
          location: "Fairhope, AL (1 hour from Gulf Shores)",
          cost: "Free admission",
          duration: "1-2 hours",
          goodFor: "Nature Lovers, Families",
          localTip: "The touch tank is great for kids - they can handle local sea creatures!"
        }
      ]
    }
  ];

  const emergencyKit = [
    "Board games or playing cards",
    "Portable phone charger/power bank",
    "Books or e-reader",
    "Craft supplies (coloring books, etc.)",
    "Snacks and drinks from local grocery",
    "Rain gear and umbrellas",
    "List of backup indoor activities"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-600 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <CloudRain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Rain in Paradise? 5 Ways to Win Your Gulf Coast Vacation When the Clouds Roll In</h1>
            <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
              Don't let a little Gulf Coast rain ruin your vacation! We've compiled the ultimate 
              rainy day itinerary with indoor adventures that are just as exciting as the beach.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Clock className="w-4 h-4" />
                <span>Ultimate 5-Spot Itinerary</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <MapPin className="w-4 h-4" />
                <span>Local Expert Picks</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Users className="w-4 h-4" />
                <span>All Ages Covered</span>
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
              <p className="text-3xl font-bold text-blue-600">95%</p>
              <p className="text-gray-600">of Gulf storms pass in under 30 minutes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">50+</p>
              <p className="text-gray-600">indoor activities listed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">24/7</p>
              <p className="text-gray-600">backup entertainment options</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-600">15 min</p>
              <p className="text-gray-600">average drive to indoor fun</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ultimate Rainy Day Itinerary */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Ultimate Rainy Day Itinerary</h2>
            <p className="text-xl text-blue-100">
              Our top 5 picks that turn a rainy day into an unforgettable Gulf Coast adventure
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-blue-900">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Tropic Falls at OWA</h3>
              <p className="text-blue-100 mb-4">
                The ultimate "Plan B" - a massive indoor waterpark under a glass roof. Tropical vibes and thrilling slides without lightning risk!
              </p>
              <div className="space-y-2 text-sm text-blue-200 mb-4">
                <p><strong>Location:</strong> Foley, AL (15 min from beaches)</p>
                <p><strong>Perfect for:</strong> Families, Teens, Adventure Seekers</p>
                <p><strong>Time Needed:</strong> 4-6 hours</p>
              </div>
              <div className="bg-white/20 rounded p-3">
                <p className="text-sm font-medium text-white">Local Secret:</p>
                <p className="text-sm text-blue-100">Go on weekdays - smaller crowds and same tropical paradise experience!</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-blue-900">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3">The Wharf's Indoor Row</h3>
              <p className="text-blue-100 mb-4">
                Park once and access 5+ indoor options: Arena The Next Level (laser tag), AMC Classic Wharf 15, shopping, and dining.
              </p>
              <div className="space-y-2 text-sm text-blue-200 mb-4">
                <p><strong>Location:</strong> Orange Beach, AL</p>
                <p><strong>Perfect for:</strong> All Ages, Groups, Date Nights</p>
                <p><strong>Time Needed:</strong> 2-4 hours</p>
              </div>
              <div className="bg-white/20 rounded p-3">
                <p className="text-sm font-medium text-white">Local Secret:</p>
                <p className="text-sm text-blue-100">Start with laser tag, then catch a movie - perfect rainy day combo!</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-blue-900">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Coastal Arts Center</h3>
              <p className="text-blue-100 mb-4">
                Get hands-on at The Hot Shop! Watch professional glass blowing or take a pottery class. Sophisticated, dry fun.
              </p>
              <div className="space-y-2 text-sm text-blue-200 mb-4">
                <p><strong>Location:</strong> Orange Beach, AL</p>
                <p><strong>Perfect for:</strong> Couples, Art Lovers, Creative Families</p>
                <p><strong>Time Needed:</strong> 2-3 hours</p>
              </div>
              <div className="bg-white/20 rounded p-3">
                <p className="text-sm font-medium text-white">Local Secret:</p>
                <p className="text-sm text-blue-100">The glass blowing demonstrations are free - pottery classes require booking ahead!</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-blue-900">4</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Gulf Bowl & Captain's Choice</h3>
              <p className="text-blue-100 mb-4">
                A local staple since 1959! 35,000 square feet of bowling, high ropes courses, and a massive arcade.
              </p>
              <div className="space-y-2 text-sm text-blue-200 mb-4">
                <p><strong>Location:</strong> Foley, AL (20 min from beaches)</p>
                <p><strong>Perfect for:</strong> Families, Groups, Competitive Fun</p>
                <p><strong>Time Needed:</strong> 3-4 hours</p>
              </div>
              <div className="bg-white/20 rounded p-3">
                <p className="text-sm font-medium text-white">Local Secret:</p>
                <p className="text-sm text-blue-100">Ask about their family packages - better value than individual activities!</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-blue-900">5</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Museum Hopping Adventure</h3>
              <p className="text-blue-100 mb-4">
                Visit Gulf Shores Museum to learn about "Hurricane Hunters" or drive 15 minutes to the world-famous Naval Aviation Museum.
              </p>
              <div className="space-y-2 text-sm text-blue-200 mb-4">
                <p><strong>Location:</strong> Gulf Shores & Pensacola, FL</p>
                <p><strong>Perfect for:</strong> History Buffs, Educational Families</p>
                <p><strong>Time Needed:</strong> 3-5 hours</p>
              </div>
              <div className="bg-white/20 rounded p-3">
                <p className="text-sm font-medium text-white">Local Secret:</p>
                <p className="text-sm text-blue-100">The Naval Aviation Museum is FREE and one of the most-visited indoor museums worldwide!</p>
              </div>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-xl p-6 border-2 border-white/30">
              <h3 className="text-xl font-bold mb-4 text-center">🌟 Pro Rainy Day Strategy</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400">▸</span>
                  <p className="text-blue-100"><strong>Morning (9-12 AM):</strong> Hit Tropic Falls when it opens - smallest crowds</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400">▸</span>
                  <p className="text-blue-100"><strong>Afternoon (12-4 PM):</strong> The Wharf Indoor Row - lunch + entertainment</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400">▸</span>
                  <p className="text-blue-100"><strong>Evening (4-7 PM):</strong> Coastal Arts Center or Gulf Bowl for wind-down fun</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-12 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <CloudRain className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">Gulf Coast Weather Wisdom</h3>
                <p className="text-blue-700 mb-3">
                  Most Gulf Coast storms are quick! Here's what locals know: Summer thunderstorms typically 
                  build in the afternoon and pass within 20-30 minutes. The best strategy? Plan indoor 
                  activities during peak storm hours (2-4 PM) and hit the beaches in the morning or evening.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="font-semibold text-blue-800">Morning (9 AM - 12 PM)</p>
                    <p className="text-sm text-blue-700">Usually clear - perfect for beach time</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="font-semibold text-blue-800">Afternoon (12 PM - 4 PM)</p>
                    <p className="text-sm text-blue-700">Peak storm time - plan indoor activities</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="font-semibold text-blue-800">Evening (4 PM - 7 PM)</p>
                    <p className="text-sm text-blue-700">Often clear again - sunset beach walks</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activities by Category */}
      {activities.map((category, index) => {
        const Icon = category.icon;
        return (
          <section key={index} className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{category.category}</h2>
                <p className="text-xl text-gray-600">
                  Perfect indoor options when the Gulf Coast weather doesn't cooperate
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.name}</h3>
                    <p className="text-gray-600 mb-4">{item.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{item.cost}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{item.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{item.goodFor}</span>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-800 mb-1">Local Tip:</p>
                      <p className="text-sm text-blue-700">{item.localTip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Emergency Rainy Day Kit */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Rainy Day Emergency Kit</h2>
            <p className="text-xl text-gray-600">
              Pack these essentials for your vacation rental to stay entertained indoors
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">What to Pack</h3>
                <ul className="space-y-3">
                  {emergencyKit.map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Pro Tips</h3>
                <div className="space-y-3 text-gray-600">
                  <p>• Download offline games and movies before your trip</p>
                  <p>• Bring a portable speaker for indoor dance parties</p>
                  <p>• Pack a deck of cards - endless entertainment possibilities</p>
                  <p>• Consider a travel projector for movie nights</p>
                  <p>• Don't forget snacks - local grocery stores have great options</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Charter Weather Crossover */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Anchor className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Fishing Charter Weather Backup</h2>
            <p className="text-xl text-blue-100">
              If your Gulf Coast Charters trip gets postponed due to weather, here's your Plan B:
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Immediate Plan</h3>
              <p className="text-blue-100 mb-4">
                Most weather delays are only 1-2 hours. Grab lunch at LuLu's or The Hangout 
                while you wait for conditions to improve.
              </p>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="https://gulfcoastcharters.com" target="_blank" rel="noopener noreferrer">
                  Check Charter Status
                </Link>
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Half Day Delay</h3>
              <p className="text-blue-100 mb-4">
                Visit the USS Alabama or Coastal Arts Center. Both are perfect rainy day 
                activities and won't take your whole day.
              </p>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="#indoor-attractions">
                  See Indoor Options
                </Link>
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Full Day Reschedule</h3>
              <p className="text-blue-100 mb-4">
                Use this guide for a full day of indoor fun. Most charters will work with 
                you to reschedule for the next available day.
              </p>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/vacation-rental-checklist">
                  Get Packing List
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
