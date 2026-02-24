import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function MyPackagesPage() {
  const user = await getServerUser()
  if (!user) {
    redirect('/auth/login?redirect=/packages/my-packages')
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/packages"
            className="text-blue-600 hover:underline mb-6 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Packages
          </Link>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Packages</h1>
            <p className="text-gray-600">
              Vacation package storage is not configured. Please set SUPABASE_SERVICE_ROLE_KEY and run migrations.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { data, error } = await admin
    .from('vacation_packages')
    .select('id, name, subtotal, discount, total, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[my-packages] Failed to load packages:', error.message)
  }

  const packages = data || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/packages"
          className="text-blue-600 hover:underline mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Packages
        </Link>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Package className="w-8 h-8 text-blue-600" />
              My Saved Packages
            </h1>
            <p className="text-gray-600">
              View vacation packages you&apos;ve built. You can reuse these when booking rentals and experiences.
            </p>
          </div>

          {packages.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 mb-4">
                You don&apos;t have any saved packages yet.
              </p>
              <Link
                href="/packages"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Build your first package
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {pkg.name}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Created{' '}
                      {pkg.created_at
                        ? new Date(pkg.created_at as string).toLocaleDateString()
                        : ''}
                      {' • '}
                      Status: <span className="font-medium">{pkg.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${Number(pkg.total ?? 0).toLocaleString()}
                    </p>
                    {Number(pkg.discount ?? 0) > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Saved ${Number(pkg.discount).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

