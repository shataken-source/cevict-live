/**
 * LocationSharing Component
 * Real-time GPS tracking with privacy controls for charter captains and users
 * Features: Live tracking, privacy modes, favorite pins, location sharing
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MapPin, Navigation, Users, Lock, Globe, Share2, Star, AlertCircle } from 'lucide-react'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Privacy modes
const PRIVACY_MODES = {
  PRIVATE: 'private',
  FRIENDS: 'friends',
  PUBLIC: 'public'
}

// Update intervals (ms)
const UPDATE_INTERVALS = {
  ACTIVE: 5000,    // 5 seconds when actively sharing
  PASSIVE: 30000,  // 30 seconds when in background
  INACTIVE: 60000  // 1 minute when minimized
}

/**
 * Main LocationSharing component
 */
export default function LocationSharing({ 
  userId, 
  userType = 'user', // 'user' or 'captain'
  onLocationUpdate,
  defaultPrivacy = PRIVACY_MODES.PRIVATE,
  showMap = true,
  allowPinning = true,
  allowSharing = true
}) {
  // State management
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [privacyMode, setPrivacyMode] = useState(defaultPrivacy)
  const [nearbyUsers, setNearbyUsers] = useState([])
  const [pinnedLocations, setPinnedLocations] = useState([])
  const [shareUrl, setShareUrl] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [accuracy, setAccuracy] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  // Refs
  const watchIdRef = useRef(null)
  const updateIntervalRef = useRef(null)
  const mapRef = useRef(null)
  const realtimeChannelRef = useRef(null)

  /**
   * Initialize component
   */
  useEffect(() => {
    // Load saved settings
    loadUserSettings()
    
    // Load pinned locations
    loadPinnedLocations()
    
    // Set up realtime subscription
    setupRealtimeSubscription()
    
    // Clean up on unmount
    return () => {
      stopTracking()
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
    }
  }, [userId])

  /**
   * Load user's saved settings
   */
  const loadUserSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_location_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setPrivacyMode(data.default_privacy || defaultPrivacy)
        if (data.auto_start && userType === 'captain') {
          startTracking()
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    }
  }

  /**
   * Load user's pinned locations
   */
  const loadPinnedLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('pinned_locations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (data) {
        setPinnedLocations(data)
      }
    } catch (err) {
      console.error('Error loading pinned locations:', err)
    }
  }

  /**
   * Set up realtime subscription for nearby users
   */
  const setupRealtimeSubscription = () => {
    realtimeChannelRef.current = supabase
      .channel('location-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_locations',
        filter: `sharing_mode=eq.public`
      }, (payload) => {
        handleRealtimeLocationUpdate(payload)
      })
      .subscribe()
  }

  /**
   * Handle realtime location updates from other users
   */
  const handleRealtimeLocationUpdate = (payload) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const location = payload.new
      if (location.user_id !== userId && currentLocation) {
        // Calculate distance to check if nearby (within 5 miles)
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          location.latitude,
          location.longitude
        )
        
        if (distance <= 5) {
          setNearbyUsers(prev => {
            const filtered = prev.filter(u => u.user_id !== location.user_id)
            return [...filtered, location]
          })
        }
      }
    } else if (payload.eventType === 'DELETE') {
      setNearbyUsers(prev => prev.filter(u => u.user_id !== payload.old.user_id))
    }
  }

  /**
   * Start location tracking
   */
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsTracking(true)
    setError(null)

    // High accuracy options for GPS
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      options
    )

    // Set up periodic updates to database
    updateIntervalRef.current = setInterval(() => {
      if (currentLocation) {
        updateLocationInDatabase(currentLocation)
      }
    }, UPDATE_INTERVALS.ACTIVE)
  }

  /**
   * Stop location tracking
   */
  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = null
    }

    setIsTracking(false)
    
    // Remove location from database
    removeLocationFromDatabase()
  }

  /**
   * Handle position update from GPS
   */
  const handlePositionUpdate = (position) => {
    const newLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    }

    setCurrentLocation(newLocation)
    setAccuracy(position.coords.accuracy)
    setLastUpdate(new Date())
    setError(null)

    // Callback to parent component
    if (onLocationUpdate) {
      onLocationUpdate(newLocation)
    }

    // Update map if showing
    if (showMap && mapRef.current) {
      updateMapPosition(newLocation)
    }

    // Find nearby users if public
    if (privacyMode === PRIVACY_MODES.PUBLIC) {
      findNearbyUsers(newLocation)
    }
  }

  /**
   * Handle position error
   */
  const handlePositionError = (error) => {
    let message = 'Unable to retrieve your location'
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location services.'
        break
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable. Please check your GPS.'
        break
      case error.TIMEOUT:
        message = 'Location request timed out. Please try again.'
        break
    }
    
    setError(message)
    console.error('Geolocation error:', error)
  }

  /**
   * Update location in database
   */
  const updateLocationInDatabase = async (location) => {
    try {
      const locationData = {
        user_id: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        heading: location.heading,
        speed: location.speed,
        sharing_mode: privacyMode,
        user_type: userType,
        metadata: {
          device: navigator.userAgent,
          timestamp: location.timestamp
        },
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_locations')
        .upsert(locationData, {
          onConflict: 'user_id'
        })

      if (error) throw error

    } catch (err) {
      console.error('Error updating location:', err)
    }
  }

  /**
   * Remove location from database
   */
  const removeLocationFromDatabase = async () => {
    try {
      const { error } = await supabase
        .from('user_locations')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

    } catch (err) {
      console.error('Error removing location:', err)
    }
  }

  /**
   * Find nearby users
   */
  const findNearbyUsers = async (location) => {
    try {
      // Query for users within approximately 5 miles
      const { data, error } = await supabase
        .from('user_locations')
        .select(`
          *,
          users (
            username,
            avatar_url,
            is_captain
          )
        `)
        .eq('sharing_mode', 'public')
        .neq('user_id', userId)
        .gte('latitude', location.latitude - 0.072) // ~5 miles
        .lte('latitude', location.latitude + 0.072)
        .gte('longitude', location.longitude - 0.072)
        .lte('longitude', location.longitude + 0.072)

      if (data) {
        // Filter by actual distance
        const nearby = data.filter(user => {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            user.latitude,
            user.longitude
          )
          return distance <= 5
        })
        
        setNearbyUsers(nearby)
      }
    } catch (err) {
      console.error('Error finding nearby users:', err)
    }
  }

  /**
   * Pin current location
   */
  const pinCurrentLocation = async (name, notes = '') => {
    if (!currentLocation) {
      setError('No location to pin')
      return
    }

    try {
      const pinData = {
        user_id: userId,
        name,
        notes,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        location_type: userType === 'captain' ? 'fishing_spot' : 'favorite',
        metadata: {
          accuracy: currentLocation.accuracy,
          pinned_at: new Date().toISOString()
        }
      }

      const { data, error } = await supabase
        .from('pinned_locations')
        .insert(pinData)
        .select()
        .single()

      if (error) throw error

      setPinnedLocations(prev => [data, ...prev])
      
      return data

    } catch (err) {
      console.error('Error pinning location:', err)
      setError('Failed to pin location')
    }
  }

  /**
   * Delete pinned location
   */
  const deletePinnedLocation = async (pinId) => {
    try {
      const { error } = await supabase
        .from('pinned_locations')
        .delete()
        .eq('id', pinId)
        .eq('user_id', userId)

      if (error) throw error

      setPinnedLocations(prev => prev.filter(p => p.id !== pinId))

    } catch (err) {
      console.error('Error deleting pin:', err)
    }
  }

  /**
   * Generate share URL
   */
  const generateShareUrl = () => {
    if (!currentLocation) return

    const baseUrl = window.location.origin
    const params = new URLSearchParams({
      lat: currentLocation.latitude.toFixed(6),
      lng: currentLocation.longitude.toFixed(6),
      user: userId,
      type: userType
    })
    
    const url = `${baseUrl}/shared-location?${params.toString()}`
    setShareUrl(url)
    
    // Copy to clipboard
    navigator.clipboard.writeText(url)
    
    return url
  }

  /**
   * Calculate distance between two coordinates (in miles)
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959 // Earth's radius in miles
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return distance
  }

  const toRad = (deg) => deg * (Math.PI / 180)

  /**
   * Update map position (placeholder for actual map integration)
   */
  const updateMapPosition = (location) => {
    // This would integrate with your map library (Google Maps, Mapbox, etc.)
    console.log('Update map position:', location)
  }

  /**
   * Format accuracy for display
   */
  const formatAccuracy = (meters) => {
    if (!meters) return 'Unknown'
    if (meters < 10) return 'Excellent (< 10m)'
    if (meters < 30) return 'Good (< 30m)'
    if (meters < 100) return 'Fair (< 100m)'
    return `Poor (${Math.round(meters)}m)`
  }

  /**
   * Format time since last update
   */
  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never'
    
    const seconds = Math.floor((new Date() - lastUpdate) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className="location-sharing-container p-4 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="header mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <Navigation className="mr-2" />
          Location Sharing
          {userType === 'captain' && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              Captain Mode
            </span>
          )}
        </h2>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertCircle className="mr-2" size={20} />
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="controls mb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={isTracking ? stopTracking : startTracking}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isTracking 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>

          {/* Privacy Mode Selector */}
          <div className="privacy-selector flex items-center space-x-2">
            <button
              onClick={() => setPrivacyMode(PRIVACY_MODES.PRIVATE)}
              className={`p-2 rounded ${
                privacyMode === PRIVACY_MODES.PRIVATE 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}
              title="Private - Only you can see"
            >
              <Lock size={20} />
            </button>
            <button
              onClick={() => setPrivacyMode(PRIVACY_MODES.FRIENDS)}
              className={`p-2 rounded ${
                privacyMode === PRIVACY_MODES.FRIENDS 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}
              title="Friends - Visible to connections"
            >
              <Users size={20} />
            </button>
            <button
              onClick={() => setPrivacyMode(PRIVACY_MODES.PUBLIC)}
              className={`p-2 rounded ${
                privacyMode === PRIVACY_MODES.PUBLIC 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}
              title="Public - Visible to all"
            >
              <Globe size={20} />
            </button>
          </div>
        </div>

        {/* Status Display */}
        {isTracking && currentLocation && (
          <div className="status-display p-3 bg-gray-50 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Latitude:</span> {currentLocation.latitude.toFixed(6)}
              </div>
              <div>
                <span className="font-medium">Longitude:</span> {currentLocation.longitude.toFixed(6)}
              </div>
              <div>
                <span className="font-medium">Accuracy:</span> {formatAccuracy(accuracy)}
              </div>
              <div>
                <span className="font-medium">Last Update:</span> {formatLastUpdate()}
              </div>
              {currentLocation.speed !== null && (
                <div>
                  <span className="font-medium">Speed:</span> {(currentLocation.speed * 2.237).toFixed(1)} mph
                </div>
              )}
              {currentLocation.heading !== null && (
                <div>
                  <span className="font-medium">Heading:</span> {Math.round(currentLocation.heading)}°
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isTracking && currentLocation && (
        <div className="action-buttons flex space-x-2 mb-4">
          {allowPinning && (
            <button
              onClick={() => {
                const name = prompt('Enter a name for this location:')
                if (name) pinCurrentLocation(name)
              }}
              className="flex items-center px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              <Star size={16} className="mr-1" />
              Pin Location
            </button>
          )}
          
          {allowSharing && (
            <button
              onClick={generateShareUrl}
              className="flex items-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Share2 size={16} className="mr-1" />
              Share Location
            </button>
          )}
        </div>
      )}

      {/* Share URL Display */}
      {shareUrl && (
        <div className="share-url-display mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-medium mb-1">Location URL copied to clipboard:</p>
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="w-full p-2 text-xs bg-white border rounded"
            onClick={(e) => e.target.select()}
          />
        </div>
      )}

      {/* Nearby Users */}
      {privacyMode === PRIVACY_MODES.PUBLIC && nearbyUsers.length > 0 && (
        <div className="nearby-users mb-4">
          <h3 className="font-medium mb-2 flex items-center">
            <Users size={18} className="mr-2" />
            Nearby Users ({nearbyUsers.length})
          </h3>
          <div className="space-y-2">
            {nearbyUsers.map(user => (
              <div key={user.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center">
                  {user.users?.avatar_url && (
                    <img 
                      src={user.users.avatar_url} 
                      alt={user.users.username}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                  )}
                  <div>
                    <span className="font-medium">{user.users?.username}</span>
                    {user.users?.is_captain && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 rounded">Captain</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {calculateDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    user.latitude,
                    user.longitude
                  ).toFixed(1)} mi
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pinned Locations */}
      {pinnedLocations.length > 0 && (
        <div className="pinned-locations">
          <h3 className="font-medium mb-2 flex items-center">
            <MapPin size={18} className="mr-2" />
            Pinned Locations ({pinnedLocations.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pinnedLocations.map(pin => (
              <div key={pin.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <div>
                  <span className="font-medium">{pin.name}</span>
                  {pin.notes && (
                    <p className="text-xs text-gray-600 mt-1">{pin.notes}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {pin.latitude.toFixed(6)}, {pin.longitude.toFixed(6)}
                  </p>
                </div>
                <button
                  onClick={() => deletePinnedLocation(pin.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Container (placeholder) */}
      {showMap && (
        <div className="map-container mt-4">
          <div 
            ref={mapRef}
            className="w-full h-64 bg-gray-200 rounded flex items-center justify-center"
          >
            <p className="text-gray-500">Map integration would go here</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Export utility functions for use elsewhere
export {
  PRIVACY_MODES,
  calculateDistance
}
