import { useEffect, useState } from 'react';

interface PetTrackerProps {
  petId: string;
}

interface TrackingData {
  petId: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  lastUpdate: Date;
  status: 'safe' | 'lost' | 'found';
  sightings: Array<{
    id: string;
    location: string;
    timestamp: Date;
    description: string;
    reportedBy: string;
  }>;
}

export default function PetTracker({ petId }: PetTrackerProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    // Simulate fetching tracking data
    const fetchTrackingData = async () => {
      setLoading(true);
      try {
        // Mock data
        const mockData: TrackingData = {
          petId,
          location: {
            lat: 40.7128,
            lng: -74.0060,
            address: '123 Main St, New York, NY'
          },
          lastUpdate: new Date(),
          status: 'lost',
          sightings: [
            {
              id: '1',
              location: 'Central Park, New York',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              description: 'Seen near the playground area',
              reportedBy: 'John Doe'
            },
            {
              id: '2',
              location: 'Times Square, New York',
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
              description: 'Running towards Broadway',
              reportedBy: 'Jane Smith'
            }
          ]
        };

        await new Promise(resolve => setTimeout(resolve, 1000));
        setTrackingData(mockData);
      } catch (error) {
        console.error('Error fetching tracking data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingData();
  }, [petId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'lost': return 'text-red-600 bg-red-100';
      case 'found': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'safe': return 'Safe';
      case 'lost': return 'Lost';
      case 'found': return 'Found';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pet Not Found</h2>
          <p className="text-gray-600">Unable to load tracking information for this pet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Pet Tracker</h2>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingData.status)}`}>
                {getStatusText(trackingData.status)}
              </span>
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
          </div>
        </div>

        {/* Current Location */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Location</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{trackingData.location.address}</p>
                <p className="text-sm text-gray-600">
                  Last updated: {trackingData.lastUpdate.toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm">
                  Update Location
                </button>
                <button className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm">
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map Placeholder */}
        {showMap && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Map View</h3>
            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-600">Interactive map would be displayed here</p>
                <p className="text-sm text-gray-500">Integration with Google Maps or similar service</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sightings */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sightings</h3>

          {trackingData.sightings.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-gray-600">No sightings reported yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trackingData.sightings.map((sighting) => (
                <div key={sighting.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h4 className="font-medium text-gray-900">{sighting.location}</h4>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">{sighting.description}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span>Reported by {sighting.reportedBy}</span>
                        <span className="mx-2">•</span>
                        <span>{sighting.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                        Verify
                      </button>
                      <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Report New Sighting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
