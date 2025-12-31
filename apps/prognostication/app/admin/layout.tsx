import AdminAuth from '@/components/admin/AdminAuth'
import BannerPlaceholder from '@/components/BannerPlaceholder'
import Link from 'next/link'
import { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuth>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold">Prognostication Admin</h1>
            <nav className="flex space-x-4">
              <Link href="/" className="text-purple-100 hover:text-white">
                Back to Site
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Header Banner */}
      <BannerPlaceholder position="header" adSlot="prognostication-admin-header" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            {/* Sidebar Banner */}
            <div className="mb-8">
              <BannerPlaceholder position="sidebar" adSlot="prognostication-admin-sidebar" />
            </div>
            <nav className="space-y-1">
              <Link
                href="/admin"
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-purple-50 text-purple-700"
              >
                📊 Dashboard
              </Link>
              <Link
                href="/admin/picks"
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                🎯 Picks Management
              </Link>
              <Link
                href="/admin/performance"
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                📈 Performance
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                👥 Users
              </Link>
              <Link
                href="/admin/revenue"
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                💰 Revenue
              </Link>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1">
            {children}
            {/* In-Content Banner */}
            <div className="my-8">
              <BannerPlaceholder position="in-content" adSlot="prognostication-admin-incontent" />
            </div>
          </main>
        </div>
      </div>

      {/* Footer Banner */}
      <BannerPlaceholder position="footer" adSlot="prognostication-admin-footer" />
    </div>
    </AdminAuth>
  )
}
