import Link from 'next/link';

// Force dynamic rendering to avoid useContext errors during static generation
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back to fishing!
          </p>
        </div>

        <div className="space-y-4">
          <Link 
            href="/"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg inline-flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </Link>
          
          <Link 
            href="/charters"
            className="w-full border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium py-3 px-4 rounded-lg inline-flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Browse Charters
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Looking for something specific?
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/charters" className="text-sm text-blue-600 hover:text-blue-800">
              Charters
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/about" className="text-sm text-blue-600 hover:text-blue-800">
              About Us
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/gallery" className="text-sm text-blue-600 hover:text-blue-800">
              Gallery
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/contact" className="text-sm text-blue-600 hover:text-blue-800">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
