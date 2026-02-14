import Link from 'next/link';
import { Home, Search, MapPin, Anchor, Waves } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 bg-blue-700 rounded-full flex items-center justify-center">
              <span className="text-6xl font-bold text-white">404</span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center">
              <Waves className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Oops! Page Not Found
        </h1>
        
        <p className="text-xl text-blue-200 mb-8 max-w-lg mx-auto">
          The page you're looking for seems to have gone fishing. 
          Let's get you back to planning your perfect vacation!
        </p>

        {/* Search Suggestions */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8 border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
            <Search className="w-5 h-5" />
            Were you looking for?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/"
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">Home</span>
            </Link>
            <Link
              href="/search"
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">Search</span>
            </Link>
            <Link
              href="/destinations/gulf-coast"
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-colors"
            >
              <MapPin className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">Destinations</span>
            </Link>
            <Link
              href="/charters"
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-colors"
            >
              <Anchor className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">Charters</span>
            </Link>
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Popular Gulf Coast Destinations</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/destination/orange-beach-al"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              Orange Beach, AL
            </Link>
            <Link
              href="/destination/gulf-shores-al"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              Gulf Shores, AL
            </Link>
            <Link
              href="/destination/destin-fl"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              Destin, FL
            </Link>
            <Link
              href="/destination/panama-city-beach-fl"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              Panama City Beach, FL
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105"
          >
            ← Back to Home
          </Link>
          <Link
            href="/search"
            className="px-8 py-3 bg-white/20 backdrop-blur text-white font-semibold rounded-lg hover:bg-white/30 transition-all transform hover:scale-105"
          >
            Start Planning
          </Link>
        </div>

        {/* Help Section */}
        <div className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Need Help?</h3>
          <p className="text-blue-200 mb-4">
            If you believe this is an error or need assistance finding something, 
            our team is here to help you plan your perfect Gulf Coast vacation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:(251) 555-0123"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Call (251) 555-0123
            </a>
            <a
              href="mailto:help@wheretovacation.com"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Email Support
            </a>
          </div>
        </div>

        {/* Fun Message */}
        <div className="mt-8 text-blue-300 text-sm">
          <p>🐠 Even the best fishermen sometimes lose their way!</p>
          <p className="mt-1">Let us help you navigate back to your perfect vacation.</p>
        </div>
      </div>
    </div>
  );
}
