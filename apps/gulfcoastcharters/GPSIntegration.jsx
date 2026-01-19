import React, { useState, useEffect } from 'react';
import { Navigation, MapPin, Satellite, Wifi, WifiOff, Settings, Check, AlertCircle, RefreshCw } from 'lucide-react';

const GPSIntegration = ({ captainId, bookingId }) => {
  const [gpsConnected, setGpsConnected] = useState(false);
  const [gpsProvider, setGpsProvider] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [supportedProviders, setSupportedProviders] = useState([
    { id: 'navionics', name: 'Navionics', icon: '🗺️', supported: true },
    { id: 'garmin', name: 'Garmin Connect', icon: '📡', supported: true },
    { id: 'furuno', name: 'Furuno NavNet', icon: '⚓', supported: true },
    { id: 'simrad', name: 'Simrad GO', icon: '🧭', supported: true },
    { id: 'raymarine', name: 'Raymarine LightHouse', icon: '⛵', supported: true },
    { id: 'lowrance', name: 'Lowrance HDS', icon: '🎣', supported: true },
    { id: 'humminbird', name: 'Humminbird HELIX', icon: '🐟', supported: true },
    { id: 'browser', name: 'Browser GPS', icon: '🌐', supported: true },
  ]);

  useEffect(() => {
    // Check if GPS was previously connected
    checkExistingConnection();
    
    // Set up location sharing interval if connected
    let locationInterval;
    if (isSharing && gpsConnected) {
      locationInterval = setInterval(updateLocation, 5000); // Update every 5 seconds
    }
    
    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [isSharing, gpsConnected]);

  const checkExistingConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('captain_gps_connections')
        .select('*')
        .eq('captain_id', captainId)
        .eq('is_active', true)
        .single();

      if (data) {
        setGpsProvider(data.provider);
        setGpsConnected(true);
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Error checking GPS connection:', error);
    }
  };

  const connectToGPS = async (providerId) => {
    setConnectionStatus('connecting');
    
    try {
      if (providerId === 'browser') {
        // Use browser geolocation API
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              await saveGPSConnection(providerId, {
                type: 'browser',
                accuracy: position.coords.accuracy,
              });
              setGpsConnected(true);
              setConnectionStatus('connected');
              setGpsProvider(providerId);
            },
            (error) => {
              console.error('Browser GPS error:', error);
              setConnectionStatus('error');
              alert('Unable to access browser GPS. Please enable location services.');
            }
          );
        } else {
          alert('Geolocation is not supported by your browser');
          setConnectionStatus('error');
        }
      } else {
        // Connect to external GPS provider via API
        const apiEndpoint = getProviderAPIEndpoint(providerId);
        
        // Open OAuth window for provider authentication
        const authWindow = window.open(
          apiEndpoint.authUrl,
          'GPS Authentication',
          'width=600,height=700'
        );

        // Listen for auth callback
        window.addEventListener('message', async (event) => {
          if (event.data.type === 'gps-auth-success') {
            await saveGPSConnection(providerId, event.data.credentials);
            setGpsConnected(true);
            setConnectionStatus('connected');
            setGpsProvider(providerId);
            authWindow.close();
          }
        });
      }
    } catch (error) {
      console.error('GPS connection error:', error);
      setConnectionStatus('error');
      alert('Failed to connect to GPS provider. Please try again.');
    }
  };

  const getProviderAPIEndpoint = (providerId) => {
    const endpoints = {
      navionics: {
        authUrl: '/api/gps/navionics/auth',
        dataUrl: '/api/gps/navionics/location',
      },
      garmin: {
        authUrl: '/api/gps/garmin/auth',
        dataUrl: '/api/gps/garmin/location',
      },
      furuno: {
        authUrl: '/api/gps/furuno/auth',
        dataUrl: '/api/gps/furuno/location',
      },
      simrad: {
        authUrl: '/api/gps/simrad/auth',
        dataUrl: '/api/gps/simrad/location',
      },
      raymarine: {
        authUrl: '/api/gps/raymarine/auth',
        dataUrl: '/api/gps/raymarine/location',
      },
      lowrance: {
        authUrl: '/api/gps/lowrance/auth',
        dataUrl: '/api/gps/lowrance/location',
      },
      humminbird: {
        authUrl: '/api/gps/humminbird/auth',
        dataUrl: '/api/gps/humminbird/location',
      },
    };
    
    return endpoints[providerId] || null;
  };

  const saveGPSConnection = async (providerId, credentials) => {
    try {
      const { error } = await supabase
        .from('captain_gps_connections')
        .upsert({
          captain_id: captainId,
          provider: providerId,
          credentials: credentials,
          is_active: true,
          last_connected: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving GPS connection:', error);
      throw error;
    }
  };

  const updateLocation = async () => {
    try {
      let location;

      if (gpsProvider === 'browser') {
        // Get location from browser
        location = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                heading: position.coords.heading,
                accuracy: position.coords.accuracy,
                timestamp: new Date(position.timestamp).toISOString(),
              });
            },
            reject
          );
        });
      } else {
        // Get location from external GPS provider
        const endpoint = getProviderAPIEndpoint(gpsProvider);
        const response = await fetch(endpoint.dataUrl, {
          headers: {
            'Authorization': `Bearer ${await getGPSToken()}`,
          },
        });
        location = await response.json();
      }

      // Update current location
      setCurrentLocation(location);

      // Save to location history
      if (bookingId) {
        await saveLocationUpdate(location);
      }

      // Add to history state
      setLocationHistory(prev => [location, ...prev].slice(0, 100)); // Keep last 100 points

    } catch (error) {
      console.error('Error updating location:', error);
      setConnectionStatus('error');
    }
  };

  const saveLocationUpdate = async (location) => {
    try {
      const { error } = await supabase
        .from('location_updates')
        .insert({
          booking_id: bookingId,
          captain_id: captainId,
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy,
          provider: gpsProvider,
          timestamp: location.timestamp,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const getGPSToken = async () => {
    try {
      const { data } = await supabase
        .from('captain_gps_connections')
        .select('credentials')
        .eq('captain_id', captainId)
        .eq('provider', gpsProvider)
        .single();

      return data?.credentials?.access_token;
    } catch (error) {
      console.error('Error getting GPS token:', error);
      return null;
    }
  };

  const toggleSharing = async () => {
    if (!bookingId) {
      alert('No active booking. Start a trip to share location.');
      return;
    }

    const newSharingState = !isSharing;
    setIsSharing(newSharingState);

    if (newSharingState) {
      // Start sharing
      await updateLocation(); // Get first location immediately
      
      // Update booking with sharing status
      await supabase
        .from('bookings')
        .update({ 
          location_sharing_active: true,
          location_sharing_started: new Date().toISOString(),
        })
        .eq('id', bookingId);
    } else {
      // Stop sharing
      await supabase
        .from('bookings')
        .update({ 
          location_sharing_active: false,
          location_sharing_ended: new Date().toISOString(),
        })
        .eq('id', bookingId);
    }
  };

  const disconnectGPS = async () => {
    try {
      await supabase
        .from('captain_gps_connections')
        .update({ is_active: false })
        .eq('captain_id', captainId)
        .eq('provider', gpsProvider);

      setGpsConnected(false);
      setGpsProvider(null);
      setConnectionStatus('disconnected');
      setIsSharing(false);
      setCurrentLocation(null);
    } catch (error) {
      console.error('Error disconnecting GPS:', error);
      alert('Failed to disconnect GPS');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Satellite className="w-6 h-6 text-blue-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">GPS Integration</h2>
            <p className="text-sm text-gray-600">Share your real-time location with customers</p>
          </div>
        </div>
        {gpsConnected && (
          <div className={`flex items-center px-4 py-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
            connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-4 h-4 mr-2" />
                Connected
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 mr-2" />
                Error
              </>
            )}
          </div>
        )}
      </div>

      {/* Not Connected State */}
      {!gpsConnected && (
        <div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Why Connect GPS?</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                Share real-time location with customers during trips
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                Build trust and transparency
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                Safety feature for emergencies
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                Track trip routes automatically
              </li>
            </ul>
          </div>

          <h3 className="font-semibold text-gray-900 mb-4">Connect Your GPS Provider</h3>
          <div className="grid grid-cols-2 gap-4">
            {supportedProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => connectToGPS(provider.id)}
                disabled={!provider.supported || connectionStatus === 'connecting'}
                className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{provider.icon}</span>
                  <span className="font-medium text-gray-900">{provider.name}</span>
                </div>
                {provider.supported && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Supported
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connected State */}
      {gpsConnected && (
        <div className="space-y-6">
          {/* Current Provider */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connected Provider</p>
                <p className="text-lg font-semibold text-gray-900">
                  {supportedProviders.find(p => p.id === gpsProvider)?.name || gpsProvider}
                </p>
              </div>
              <button
                onClick={disconnectGPS}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Location Sharing Toggle */}
          <div className="border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Location Sharing</h3>
                <p className="text-sm text-gray-600">
                  {isSharing 
                    ? 'Customers can see your real-time location'
                    : 'Start a trip to enable location sharing'
                  }
                </p>
              </div>
              <button
                onClick={toggleSharing}
                disabled={!bookingId}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                  isSharing ? 'bg-green-500' : 'bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${
                    isSharing ? 'translate-x-13' : 'translate-x-1'
                  }`}
                >
                  {isSharing ? (
                    <Navigation className="w-6 h-6 m-2 text-green-500" />
                  ) : (
                    <MapPin className="w-6 h-6 m-2 text-gray-400" />
                  )}
                </span>
              </button>
            </div>

            {!bookingId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Location sharing is only available during active trips. Start a trip to enable.
                </p>
              </div>
            )}
          </div>

          {/* Current Location */}
          {currentLocation && isSharing && (
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Current Location
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Latitude</p>
                  <p className="font-mono font-semibold text-gray-900">
                    {currentLocation.latitude.toFixed(6)}°
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Longitude</p>
                  <p className="font-mono font-semibold text-gray-900">
                    {currentLocation.longitude.toFixed(6)}°
                  </p>
                </div>
                {currentLocation.speed !== null && (
                  <div>
                    <p className="text-gray-600">Speed</p>
                    <p className="font-semibold text-gray-900">
                      {(currentLocation.speed * 1.94384).toFixed(1)} knots
                    </p>
                  </div>
                )}
                {currentLocation.heading !== null && (
                  <div>
                    <p className="text-gray-600">Heading</p>
                    <p className="font-semibold text-gray-900">
                      {currentLocation.heading.toFixed(0)}°
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Accuracy</p>
                  <p className="font-semibold text-gray-900">
                    ±{currentLocation.accuracy.toFixed(0)}m
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Last Update</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(currentLocation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Map Preview */}
              <div className="mt-4">
                <a
                  href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View on Map →
                </a>
              </div>
            </div>
          )}

          {/* Location History */}
          {locationHistory.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Trip Track</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                {locationHistory.map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
                  >
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-mono text-gray-600">
                        {loc.latitude.toFixed(4)}°, {loc.longitude.toFixed(4)}°
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(loc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GPSIntegration;
