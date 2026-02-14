'use client';

import React, { useState, useEffect, useCallback } from 'react';

/**
 * LIVE SEARCH MAP COMPONENT
 * 
 * Displays sightings and AI-verified camera footage on a map.
 * Features:
 * - Pins for sightings (🔵) and camera matches (📹)
 * - Real-time updates
 * - Timeline filter
 * - Confidence indicators for AI matches
 */

interface MapPin {
  id: number;
  lat: number;
  lon: number;
  timestamp: string;
  type: 'sighting' | 'camera';
  confidence?: number;
  thumbnailUrl?: string;
  location?: string;
}

interface LiveSearchMapProps {
  petId: number;
  petName: string;
  lastSeenLat?: number;
  lastSeenLon?: number;
  onPinClick?: (pin: MapPin) => void;
}

export default function LiveSearchMap({ 
  petId, 
  petName,
  lastSeenLat,
  lastSeenLon,
  onPinClick 
}: LiveSearchMapProps) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [showSightings, setShowSightings] = useState(true);
  const [showCameraMatches, setShowCameraMatches] = useState(true);

  const fetchPins = useCallback(async () => {
    try {
      // Fetch sightings
      const sightingsRes = await fetch(`/api/petreunion/report-sighting?petId=${petId}`);
      const sightingsData = await sightingsRes.json();

      // Fetch camera uploads
      const uploadsRes = await fetch(`/api/petreunion/camera-watch/upload?petId=${petId}`);
      const uploadsData = await uploadsRes.json();

      const allPins: MapPin[] = [];

      // Add sightings
      for (const s of sightingsData.sightings || []) {
        if (s.sighting_lat && s.sighting_lon) {
          allPins.push({
            id: s.id,
            lat: s.sighting_lat,
            lon: s.sighting_lon,
            timestamp: s.sighting_date,
            type: 'sighting',
            location: s.sighting_location,
            thumbnailUrl: s.photo_url
          });
        }
      }

      // Add camera uploads with matches
      for (const u of uploadsData.uploads || []) {
        if (u.ai_match_confidence > 0.5 && u.capture_location_lat) {
          allPins.push({
            id: u.id + 10000, // Offset to avoid ID collision
            lat: u.capture_location_lat,
            lon: u.capture_location_lon,
            timestamp: u.capture_timestamp || u.created_at,
            type: 'camera',
            confidence: u.ai_match_confidence,
            thumbnailUrl: u.thumbnail_url || u.storage_url,
            location: u.capture_location_text
          });
        }
      }

      // Sort by timestamp, most recent first
      allPins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setPins(allPins);
    } catch (error) {
      console.error('[LiveSearchMap] Error fetching pins:', error);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    fetchPins();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPins, 30000);
    return () => clearInterval(interval);
  }, [fetchPins]);

  // Filter pins by time
  const filteredPins = pins.filter(pin => {
    if (timeFilter === 'all') return true;
    
    const pinTime = new Date(pin.timestamp).getTime();
    const now = Date.now();
    
    if (timeFilter === '24h') return now - pinTime < 24 * 60 * 60 * 1000;
    if (timeFilter === '7d') return now - pinTime < 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === '30d') return now - pinTime < 30 * 24 * 60 * 60 * 1000;
    
    return true;
  }).filter(pin => {
    if (pin.type === 'sighting' && !showSightings) return false;
    if (pin.type === 'camera' && !showCameraMatches) return false;
    return true;
  });

  const handlePinClick = (pin: MapPin) => {
    setSelectedPin(pin);
    onPinClick?.(pin);
  };

  // Calculate map bounds
  const allLats = [lastSeenLat || 0, ...filteredPins.map(p => p.lat)].filter(Boolean);
  const allLons = [lastSeenLon || 0, ...filteredPins.map(p => p.lon)].filter(Boolean);
  
  const centerLat = allLats.length > 0 ? allLats.reduce((a, b) => a + b, 0) / allLats.length : 0;
  const centerLon = allLons.length > 0 ? allLons.reduce((a, b) => a + b, 0) / allLons.length : 0;

  return (
    <div style={{
      backgroundColor: '#161b22',
      borderRadius: '16px',
      border: '1px solid #374151',
      overflow: 'hidden'
    }}>
      {/* Map Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #374151',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>
            🗺️ Live Search Map
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
            Tracking {petName} • {filteredPins.length} locations
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#0d1117',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: '#d1d5db',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={showSightings}
              onChange={(e) => setShowSightings(e.target.checked)}
              style={{ accentColor: '#3b82f6' }}
            />
            🔵 Sightings
          </label>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: '#d1d5db',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={showCameraMatches}
              onChange={(e) => setShowCameraMatches(e.target.checked)}
              style={{ accentColor: '#00ff41' }}
            />
            📹 Camera Matches
          </label>
        </div>
      </div>

      {/* Map Placeholder (Static map visualization) */}
      <div style={{
        position: 'relative',
        height: '400px',
        backgroundColor: '#0d1117',
        backgroundImage: 'radial-gradient(circle at center, #1f2937 0%, #0d1117 100%)'
      }}>
        {loading ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔄</div>
              <p>Loading map data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Map Grid (placeholder) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.1,
              backgroundImage: `
                linear-gradient(#374151 1px, transparent 1px),
                linear-gradient(90deg, #374151 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }} />

            {/* Last Seen Marker */}
            {lastSeenLat && lastSeenLon && (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -100%)',
                zIndex: 10
              }}>
                <div style={{
                  fontSize: '2rem',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                  📍
                </div>
                <div style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                  marginTop: '-4px'
                }}>
                  LAST SEEN
                </div>
              </div>
            )}

            {/* Pin Markers (simplified visualization) */}
            {filteredPins.slice(0, 10).map((pin, index) => (
              <div
                key={pin.id}
                onClick={() => handlePinClick(pin)}
                style={{
                  position: 'absolute',
                  left: `${30 + (index % 5) * 10}%`,
                  top: `${20 + Math.floor(index / 5) * 30}%`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  zIndex: selectedPin?.id === pin.id ? 20 : 5
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.3)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{
                  fontSize: '1.5rem',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                  {pin.type === 'camera' ? '📹' : '🔵'}
                </div>
                {pin.type === 'camera' && pin.confidence && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    backgroundColor: pin.confidence > 0.8 ? '#00ff41' : '#f59e0b',
                    color: 'black',
                    fontSize: '0.625rem',
                    fontWeight: 'bold',
                    padding: '2px 4px',
                    borderRadius: '999px'
                  }}>
                    {Math.round(pin.confidence * 100)}%
                  </div>
                )}
              </div>
            ))}

            {/* "Open in Google Maps" button */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLon}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                padding: '8px 16px',
                backgroundColor: '#1f2937',
                color: '#d1d5db',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🗺️ Open in Google Maps
            </a>

            {/* Pin count */}
            {filteredPins.length > 10 && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                padding: '8px 12px',
                backgroundColor: '#1f2937',
                color: '#9ca3af',
                borderRadius: '6px',
                fontSize: '0.75rem'
              }}>
                Showing 10 of {filteredPins.length} locations
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Pin Details */}
      {selectedPin && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #374151',
          backgroundColor: '#0d1117'
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {selectedPin.thumbnailUrl && (
              <img
                src={selectedPin.thumbnailUrl}
                alt="Sighting"
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>
                  {selectedPin.type === 'camera' ? '📹' : '🔵'}
                </span>
                <h4 style={{ color: 'white', fontWeight: 'bold', margin: 0 }}>
                  {selectedPin.type === 'camera' ? 'AI Camera Match' : 'Reported Sighting'}
                </h4>
                {selectedPin.confidence && (
                  <span style={{
                    backgroundColor: selectedPin.confidence > 0.8 ? '#00ff41' : '#f59e0b',
                    color: 'black',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}>
                    {Math.round(selectedPin.confidence * 100)}% match
                  </span>
                )}
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '4px' }}>
                📍 {selectedPin.location || `${selectedPin.lat.toFixed(4)}, ${selectedPin.lon.toFixed(4)}`}
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                🕐 {new Date(selectedPin.timestamp).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setSelectedPin(null)}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {filteredPins.length > 0 && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #374151',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <h4 style={{ color: '#d1d5db', fontSize: '0.875rem', marginBottom: '12px' }}>
            📋 Recent Activity
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredPins.slice(0, 5).map(pin => (
              <div
                key={pin.id}
                onClick={() => handlePinClick(pin)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  backgroundColor: selectedPin?.id === pin.id ? 'rgba(0, 255, 65, 0.1)' : '#0d1117',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <span>{pin.type === 'camera' ? '📹' : '🔵'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: 0 }}>
                    {pin.type === 'camera' ? 'Camera match' : 'Sighting'} at {pin.location || 'Unknown location'}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>
                    {new Date(pin.timestamp).toLocaleString()}
                  </p>
                </div>
                {pin.confidence && (
                  <span style={{
                    backgroundColor: pin.confidence > 0.8 ? 'rgba(0,255,65,0.2)' : 'rgba(245,158,11,0.2)',
                    color: pin.confidence > 0.8 ? '#00ff41' : '#f59e0b',
                    fontSize: '0.75rem',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {Math.round(pin.confidence * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

