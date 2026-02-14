/**
 * Vessel Details Page
 * 
 * Route: /vessels/[id]
 * Displays detailed information about a specific vessel
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Badge } from '../../src/components/ui/badge';
import { MapPin, Users, Anchor, Calendar, DollarSign, Star, ArrowLeft, Phone, Mail } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { toast } from 'sonner';
import BookingModal from '../../src/components/BookingModal';

function vesselEmoji(type: string) {
  const t = String(type || '').toLowerCase();
  if (t.includes('jet') || t.includes('sea_doo') || t.includes('waverunner')) return '🚤';
  if (t.includes('pontoon')) return '⛵';
  if (t.includes('wake') || t.includes('surf') || t.includes('ski')) return '🏄';
  if (t.includes('yacht')) return '🛥️';
  if (t.includes('kayak') || t.includes('canoe')) return '🛶';
  if (t.includes('paddle')) return '🏄‍♂️';
  if (t.includes('fish') || t.includes('console') || t.includes('bay') || t.includes('inshore') || t.includes('offshore'))
    return '🎣';
  return '⚓';
}

export default function VesselDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [vessel, setVessel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function loadVessel() {
      try {
        setLoading(true);
        setError(null);

        // Try fetching from vessels table first
        const { data: vesselData, error: vesselError } = await supabase
          .from('vessels')
          .select('*')
          .eq('id', id)
          .single();

        if (vesselError) {
          // Try fetching from boats table (legacy)
          const { data: boatData, error: boatError } = await supabase
            .from('boats')
            .select('*')
            .eq('id', id)
            .single();

          if (boatError) {
            throw new Error('Vessel not found');
          }

          setVessel({
            ...boatData,
            id: boatData.id,
            name: boatData.name,
            type: boatData.type,
            capacity: boatData.capacity,
            home_port: boatData.home_port,
            price: boatData.price,
            rating: boatData.rating,
            reviews: boatData.reviews,
            photos: boatData.photos || (boatData.image ? [boatData.image] : []),
            specialties: boatData.specialties || [],
            available: boatData.available !== false,
          });
        } else {
          setVessel(vesselData);
        }
      } catch (err: any) {
        console.error('Error loading vessel:', err);
        setError(err.message || 'Failed to load vessel details');
        toast.error('Failed to load vessel details');
      } finally {
        setLoading(false);
      }
    }

    loadVessel();
  }, [id]);

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-6xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !vessel) {
    return (
      <Layout session={null}>
        <div className="max-w-6xl mx-auto p-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Vessel Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The vessel you are looking for does not exist.'}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/vessels')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Vessels
              </Button>
              <Button onClick={() => router.push('/captains')}>
                Browse Captains
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const photos = Array.isArray(vessel.photos) ? vessel.photos : vessel.image ? [vessel.image] : [];
  const mainPhoto = photos[0] || null;

  // Deep link into WhereToVacation search with this vessel's home port when available
  const wtvBase =
    process.env.NEXT_PUBLIC_WTV_URL || 'https://wheretovacation.cevict.ai';
  const wtvDestinationQuery = vessel.home_port
    ? `?destination=${encodeURIComponent(String(vessel.home_port))}`
    : '';
  const wtvUrl = `${wtvBase}${wtvDestinationQuery}`;

  return (
    <Layout session={null}>
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/vessels">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Vessels
            </Button>
          </Link>
        </div>

        {/* Main Vessel Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Photo Section */}
          <Card className="overflow-hidden">
            <div className="relative h-96 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              {mainPhoto ? (
                <img 
                  src={mainPhoto} 
                  alt={vessel.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-8xl">{vesselEmoji(vessel.type || '')}</div>
              )}
              {vessel.featured && (
                <div className="absolute top-4 right-4 bg-yellow-300 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                  Featured
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="p-4 grid grid-cols-4 gap-2">
                {photos.slice(1, 5).map((photo: string, idx: number) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`${vessel.name} ${idx + 2}`}
                    className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Details Section */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{vessel.name}</h1>
              <p className="text-lg text-gray-600 mb-4">{vessel.type || 'Vessel'}</p>
              
              {vessel.rating && (
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{Number(vessel.rating).toFixed(1)}</span>
                  {vessel.reviews && (
                    <span className="text-gray-600">({vessel.reviews} reviews)</span>
                  )}
                </div>
              )}
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                {vessel.home_port && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Home Port</p>
                      <p className="font-semibold">{vessel.home_port}</p>
                    </div>
                  </div>
                )}

                {vessel.capacity && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Capacity</p>
                      <p className="font-semibold">Up to {vessel.capacity} guests</p>
                    </div>
                  </div>
                )}

                {vessel.price && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Starting Price</p>
                      <p className="text-2xl font-bold text-green-600">${vessel.price}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Badge variant={vessel.available ? 'default' : 'secondary'} className="text-sm">
                    {vessel.available ? 'Available for Booking' : 'Currently Unavailable'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button 
                onClick={() => setShowBookingModal(true)} 
                className="flex-1"
                disabled={!vessel.available}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book This Vessel
              </Button>
              <Button variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Contact
              </Button>
            </div>
          </div>
        </div>

        {/* Specialties */}
        {Array.isArray(vessel.specialties) && vessel.specialties.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Specialties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {vessel.specialties.map((specialty: string) => (
                  <Badge key={specialty} variant="outline" className="text-sm">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nearby Places to Stay (WhereToVacation) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Need a place to stay?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Plan your full trip by finding vacation rentals near this charter.
            </p>
            <a
              href={wtvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Browse nearby rentals on Where To Vacation
            </a>
          </CardContent>
        </Card>

        {/* Description */}
        {vessel.description && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>About This Vessel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-line">{vessel.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Amenities/Features */}
        {vessel.amenities && Array.isArray(vessel.amenities) && vessel.amenities.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Amenities & Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {vessel.amenities.map((amenity: string) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Modal */}
        {showBookingModal && vessel && (
          <BookingModal
            isOpen={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            charter={vessel}
          />
        )}
      </div>
    </Layout>
  );
}
