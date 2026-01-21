import Link from 'next/link'
import { MapPin, Plane, Hotel, Car, AlertCircle } from 'lucide-react'

export default function TravelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Travel Legality Guides
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Know the laws before you travel. Domestic and international guides to help you navigate smoking and vaping restrictions.
          </p>
        </div>

        {/* Domestic Travel */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Domestic Travel</h2>
          </div>
          <p className="text-gray-600 mb-6">
            State-by-state guide for traveling within the United States. Know the laws before you cross state lines.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">State-to-State Guide</h3>
              <p className="text-sm text-gray-600 mb-4">
                Compare laws across states. Perfect for road trips and cross-country travel.
              </p>
              <Link
                href="/travel/domestic"
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                View Guide →
              </Link>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Airport Smoking Areas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Find designated smoking areas at major US airports. Updated regularly.
              </p>
              <Link
                href="/travel/airports"
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                View Guide →
              </Link>
            </div>
          </div>
        </div>

        {/* International Travel */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Plane className="w-8 h-8 text-purple-600" />
            <h2 className="text-3xl font-bold text-gray-900">International Travel</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Navigate smoking and vaping laws in popular international destinations. Laws vary significantly by country.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {['Canada', 'Mexico', 'United Kingdom', 'France', 'Germany', 'Japan', 'Australia', 'New Zealand', 'Thailand'].map((country) => (
              <Link
                key={country}
                href={`/travel/international/${country.toLowerCase().replace(' ', '-')}`}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition"
              >
                <h3 className="font-semibold text-gray-900">{country}</h3>
                <p className="text-xs text-gray-500 mt-1">View laws →</p>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/travel/international"
              className="text-purple-600 hover:text-purple-700 font-semibold"
            >
              View All Countries →
            </Link>
          </div>
        </div>

        {/* Hotel & Rental Policies */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Hotel className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Hotel Policies</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Major hotel chains' smoking policies. Know before you book.
            </p>
            <Link
              href="/travel/hotels"
              className="text-green-600 hover:text-green-700 font-semibold"
            >
              View Hotel Guide →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Car className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">Rental Car Policies</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Smoking policies for major rental car companies. Avoid surprise fees.
            </p>
            <Link
              href="/travel/rental-cars"
              className="text-orange-600 hover:text-orange-700 font-semibold"
            >
              View Rental Guide →
            </Link>
          </div>
        </div>

        {/* Premium CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Premium Travel Guides</h2>
          </div>
          <p className="text-blue-100 mb-4">
            Get detailed, downloadable PDF guides for your specific travel destinations. Updated monthly with the latest law changes.
          </p>
          <Link
            href="/premium"
            className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Upgrade to Premium
          </Link>
        </div>
      </div>
    </div>
  )
}
