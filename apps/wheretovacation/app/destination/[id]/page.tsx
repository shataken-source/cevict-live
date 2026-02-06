import { notFound } from 'next/navigation'
import { getSupabaseAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { MapPin, Calendar, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Destination {
  id: string
  name: string
  attractions?: string[]
  last_updated?: string
}

async function getDestination(id: string): Promise<Destination | null> {
  const admin = getSupabaseAdminClient()
  if (!admin) return null

  const { data, error } = await admin
    .from('destinations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Destination
}

export default async function DestinationPage({
  params,
}: {
  params: { id: string }
}) {
  const destination = await getDestination(params.id)

  if (!destination) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/search"
          className="text-blue-600 hover:underline mb-4 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {destination.name}
          </h1>

          {destination.attractions && destination.attractions.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Attractions
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {destination.attractions.map((attraction, index) => (
                  <li key={index}>{attraction}</li>
                ))}
              </ul>
            </div>
          )}

          {destination.last_updated && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Calendar className="w-4 h-4" />
              <span>
                Last updated: {new Date(destination.last_updated).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Plan Your Visit
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/rentals"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Find Vacation Rentals
              </Link>
              <Link
                href="/search?includeBoats=true"
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center"
              >
                Book Boat Charters
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
