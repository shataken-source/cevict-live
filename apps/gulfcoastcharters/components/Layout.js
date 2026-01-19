import Link from 'next/link'
import Image from 'next/image'

export default function Layout({ children, session }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 relative">
                  <Image
                    src="/logo.svg"
                    alt="Gulf Coast Charters"
                    width={32}
                    height={32}
                    className="h-8 w-auto"
                  />
                </div>
                <span className="ml-3 text-xl font-bold text-blue-600">Gulf Coast Charters</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/captains" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">
                Find a Captain
              </Link>
              <Link href="/vessels" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">
                Vessels
              </Link>
              {session ? (
                <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                  Dashboard
                </Link>
              ) : (
                <Link href="/admin/login" className="px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}



