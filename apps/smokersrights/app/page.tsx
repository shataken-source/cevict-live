import Link from 'next/link'
import { Search, Scale, ShoppingBag, MapPin, FileText, ArrowRight, Crown, Bot, MapPinned, Bookmark } from 'lucide-react'
import BuyMeACoffee from '@/components/ads/BuyMeACoffee'
import AdBanner from '@/components/ads/AdBanner'
import LegislationTracker from '@/components/LegislationTracker'
import NearbyPlaces from '@/components/NearbyPlaces'
import AIAssistant from '@/components/AIAssistant'
import EnhancedSearch from '@/components/EnhancedSearch'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            SmokersRights.com
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/premium" className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Premium</span>
            </Link>
            <BuyMeACoffee variant="button" />
          </div>
        </div>
      </nav>

      {/* Ad Banner - Header */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <AdBanner slot="header-banner" format="horizontal" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            SmokersRights.com
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-gray-800 max-w-3xl mx-auto mb-4">
            The Legal Navigator for Adult Tobacco Rights
          </p>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-2">
            Know your rights. Navigate the laws. Travel with confidence.
          </p>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto">
            Your authoritative guide to smoking and vaping laws across all 50 states.
          </p>
        </div>

        {/* Enhanced Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <EnhancedSearch onSearch={(q) => console.log('Search:', q)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">50</div>
            <div className="text-sm text-gray-600">States Covered</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">400+</div>
            <div className="text-sm text-gray-600">Laws Tracked</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">Always</div>
            <div className="text-sm text-gray-600">Updated</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">Free</div>
            <div className="text-sm text-gray-600">To Use</div>
          </div>
        </div>

        {/* New Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <LegislationTracker initialState="GA" />
          <NearbyPlaces />
        </div>

        {/* AI Assistant Section */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">AI Legal Assistant</h2>
              <p className="text-slate-600">Ask about laws, products, or get legal guidance</p>
            </div>
          </div>
          <AIAssistant />
        </section>

        {/* Main Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Link
            href="/search"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">State Law Guides</h2>
            <p className="text-gray-600 text-center mb-4">
              Comprehensive, up-to-date legal guides for all 50 states
            </p>
            <div className="text-center">
              <span className="text-blue-600 font-semibold flex items-center justify-center gap-2">
                Explore <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          <Link
            href="/travel"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">Travel Guides</h2>
            <p className="text-gray-600 text-center mb-4">
              Know the laws before you travel - domestic and international
            </p>
            <div className="text-center">
              <span className="text-purple-600 font-semibold flex items-center justify-center gap-2">
                Travel Guide <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          <Link
            href="/workplace"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">Workplace Rights</h2>
            <p className="text-gray-600 text-center mb-4">
              Understand your rights as an employee and tenant
            </p>
            <div className="text-center">
              <span className="text-green-600 font-semibold flex items-center justify-center gap-2">
                Learn More <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </div>

        {/* Recent Law Updates */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              Recent Law Updates
            </h2>
            <Link href="/legal" className="text-blue-600 hover:text-blue-700 font-semibold">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">Alabama</h3>
                <span className="text-sm text-gray-500">Updated 1/20/2026</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Indoor Smoking:</strong> Statewide indoor smoking restrictions for public workplaces; local ordinances may be stricter.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">Florida</h3>
                <span className="text-sm text-gray-500">Updated 1/20/2026</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Vaping:</strong> Clean Indoor Air Act updated to include vaping in most indoor workplaces; beaches/localities may add outdoor restrictions.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">Georgia</h3>
                <span className="text-sm text-gray-500">Updated 1/20/2026</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Indoor Smoking:</strong> Smokefree Air Act limits indoor smoking with exemptions for bars and certain hospitality venues.
              </p>
            </div>
          </div>
        </div>

        {/* State Map */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Browse All 50 States</h2>
          <div className="grid grid-cols-8 md:grid-cols-10 gap-2">
            {['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'].map((state) => (
              <Link
                key={state}
                href={`/legal/${state.toLowerCase()}`}
                className="bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded px-3 py-2 text-center text-sm font-medium transition-colors"
              >
                {state}
              </Link>
            ))}
          </div>
        </div>

        {/* Support Card */}
        <div className="max-w-md mx-auto mb-12">
          <BuyMeACoffee variant="card" />
        </div>

        {/* Premium Subscription CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span>⚖️</span> Premium Legal Navigator
              </h2>
              <p className="text-blue-100 mb-4">
                Get weekly legal updates, detailed travel guides, and exclusive state law deep-dives
              </p>
              <ul className="text-blue-100 mb-4 space-y-1 text-sm">
                <li>✓ Weekly legal update emails</li>
                <li>✓ Detailed travel guides (PDF)</li>
                <li>✓ Exclusive state law deep-dives</li>
                <li>✓ Ad-free experience</li>
                <li>✓ Mobile app access</li>
              </ul>
              <Link
                href="/premium"
                className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Subscribe - $9.99/month
              </Link>
            </div>
          </div>
        </div>

        {/* Ad Banner - Footer */}
        <div className="mt-12 mb-8">
          <AdBanner slot="footer-banner" format="horizontal" />
        </div>

        {/* Footer */}
        <footer className="border-t pt-8 text-center text-sm text-gray-600">
          <p>© 2026 SmokersRights.com - Your Legal Navigator for Adult Tobacco Rights</p>
          <p className="mt-2">
            <Link href="/about" className="underline hover:text-gray-900">About</Link> |
            <Link href="/contact" className="underline hover:text-gray-900 ml-2">Contact</Link> |
            <Link href="/premium" className="underline hover:text-amber-600 ml-2">Go Premium</Link> |
            <Link href="/affiliates" className="underline hover:text-gray-900 ml-2">Affiliates</Link>
          </p>
        </footer>

        {/* Floating Support Button (mobile) */}
        <div className="lg:hidden">
          <BuyMeACoffee variant="floating" />
        </div>
      </div>
    </div>
  )
}
