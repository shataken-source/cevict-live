import { notFound } from 'next/navigation'
import { getSupabaseAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import BookingButton from '@/components/BookingButton'
import ChartersNearby from '@/components/ChartersNearby'
import { ArrowLeft, Home, Users, MapPin, DollarSign } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Rental {
  id: string
  name: string
  type: string
  description?: string
  bedrooms?: number
  bathrooms?: number
  max_guests?: number
  nightly_rate?: number
  weekly_rate?: number
  cleaning_fee?: number
  address?: string
  distance_to_beach_miles?: number
  photos?: string[]
  amenities?: string[]
  destination_name?: string
}

async function getRental(id: string): Promise<Rental | null> {
  const admin = getSupabaseAdminClient()
  if (!admin) return null

  try {
    const { data, error } = await admin
      .from('accommodations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data as Rental
  } catch {
    return null
  }
}

export default async function RentalDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const rental = await getRental(params.id)

  if (!rental) {
    notFound()
  }

  const destinationHint =
    rental.destination_name ||
    (rental.address ? rental.address.split(',')[0] : undefined)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/rentals"
          className="text-blue-600 hover:underline mb-4 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Rentals
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Content */}
          <div>
            {rental.photos && rental.photos.length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <img
                  src={rental.photos[0]}
                  alt={rental.name}
                  className="w-full h-96 object-cover"
                />
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{rental.name}</h1>

              {rental.address && (
                <p className="text-gray-600 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {rental.address}
                </p>
              )}

              {rental.description && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Description</h2>
                  <p className="text-gray-700">{rental.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                {rental.bedrooms && (
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bedrooms</p>
                      <p className="font-semibold">{rental.bedrooms}</p>
                    </div>
                  </div>
                )}
                {rental.max_guests && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Max Guests</p>
                      <p className="font-semibold">{rental.max_guests}</p>
                    </div>
                  </div>
                )}
              </div>

              {rental.amenities && rental.amenities.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {rental.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center gap-2 text-gray-700">
                        <span className="text-green-500">✓</span>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cross-app integration: suggest GCC charters near this rental */}
              <ChartersNearby destinationHint={destinationHint} />
            </div>
          </div>

          {/* Booking Sidebar */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <div className="mb-6">
                {rental.nightly_rate && (
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                      <span className="text-3xl font-bold text-gray-900">
                        ${rental.nightly_rate.toLocaleString()}
                      </span>
                      <span className="text-gray-600">/night</span>
                    </div>
                    {rental.weekly_rate && (
                      <p className="text-gray-600 text-sm mt-1">
                        ${rental.weekly_rate.toLocaleString()}/week
                      </p>
                    )}
                  </div>
                )}

                {rental.cleaning_fee && (
                  <p className="text-gray-600 text-sm mb-4">
                    Cleaning fee: ${rental.cleaning_fee}
                  </p>
                )}
              </div>

              <BookingButton rentalId={rental.id} rentalName={rental.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
