'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import CatProbabilityMap from '../../components/CatProbabilityMap';

export default function PetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPetDetails();
  }, [params.id]);

  const fetchPetDetails = async () => {
    try {
      const response = await fetch(`/api/petreunion/pet/${params.id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPet(data.pet);
      } else {
        setError(data.error || 'Pet not found');
      }
    } catch (err) {
      console.error('Error fetching pet details:', err);
      setError('Failed to load pet details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading pet details...</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pet Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The pet you are looking for does not exist.'}</p>
          <Link href="/search" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const isCat = pet.pet_type?.toLowerCase() === 'cat';
  const isLost = pet.status?.toLowerCase() === 'lost';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/search" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Pet Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              {pet.photo_url && (
                <div className="mb-6">
                  <img
                    src={pet.photo_url}
                    alt={pet.pet_name || 'Pet photo'}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              )}

              <h1 className="text-3xl font-bold text-gray-900 mb-2">{pet.pet_name || 'Unknown Name'}</h1>
              <p className="text-xl text-gray-700 mb-4">{pet.breed} {pet.pet_type}</p>

              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-24">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pet.status === 'lost' ? 'bg-red-100 text-red-800' :
                    pet.status === 'found' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {pet.status?.toUpperCase()}
                  </span>
                </div>

                {pet.color && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-24">Color:</span>
                    <span className="text-gray-900">{pet.color}</span>
                  </div>
                )}

                {pet.size && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-24">Size:</span>
                    <span className="text-gray-900">{pet.size}</span>
                  </div>
                )}

                {pet.age && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-24">Age:</span>
                    <span className="text-gray-900">{pet.age}</span>
                  </div>
                )}

                {pet.gender && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-24">Gender:</span>
                    <span className="text-gray-900">{pet.gender}</span>
                  </div>
                )}

                <div className="flex items-start">
                  <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-1" />
                  <div>
                    <span className="font-semibold text-gray-700">Last Seen:</span>
                    <p className="text-gray-900">
                      {pet.location_city && pet.location_state
                        ? `${pet.location_city}, ${pet.location_state}`
                        : pet.location || 'Unknown'}
                    </p>
                  </div>
                </div>

                {pet.date_lost && (
                  <div className="flex items-start">
                    <Calendar className="w-4 h-4 text-gray-500 mr-2 mt-1" />
                    <div>
                      <span className="font-semibold text-gray-700">Date Lost:</span>
                      <p className="text-gray-900">
                        {new Date(pet.date_lost).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {pet.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 text-sm">{pet.description}</p>
                </div>
              )}

              {(pet.owner_email || pet.owner_phone) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    {pet.owner_name && (
                      <p className="text-gray-700">
                        <span className="font-medium">Name:</span> {pet.owner_name}
                      </p>
                    )}
                    {pet.owner_email && (
                      <p className="text-gray-700">
                        <span className="font-medium">Email:</span>{' '}
                        <a href={`mailto:${pet.owner_email}`} className="text-blue-600 hover:underline">
                          {pet.owner_email}
                        </a>
                      </p>
                    )}
                    {pet.owner_phone && (
                      <p className="text-gray-700">
                        <span className="font-medium">Phone:</span>{' '}
                        <a href={`tel:${pet.owner_phone}`} className="text-blue-600 hover:underline">
                          {pet.owner_phone}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - AI Probability Map (Cats Only) */}
          <div className="lg:col-span-2">
            {isCat && isLost ? (
              <CatProbabilityMap
                petName={pet.pet_name || 'this cat'}
                isIndoorOnly={pet.is_indoor_only || false}
                lastSeenLat={pet.last_seen_lat || 0}
                lastSeenLng={pet.last_seen_lng || 0}
                lastSeenTime={new Date(pet.date_lost || Date.now())}
                color={pet.color || 'unknown'}
                age={parseInt(pet.age) || 3}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Help Find {pet.pet_name}!</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 mb-4">
                    If you have any information about {pet.pet_name}, please contact the owner immediately.
                  </p>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Tips for Finding Lost Pets</h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li>• Check nearby shelters and vet clinics</li>
                      <li>• Post flyers in the neighborhood</li>
                      <li>• Search social media lost pet groups</li>
                      <li>• Ask neighbors if they've seen your pet</li>
                      <li>• Leave familiar-smelling items outside your home</li>
                    </ul>
                  </div>
                  {!isCat && (
                    <p className="text-sm text-gray-600 italic">
                      💡 AI-powered search predictions are currently available for cats only.
                      Dog predictions coming soon!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
