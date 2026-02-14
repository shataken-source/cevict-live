'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchArea {
  priority: number;
  radius: number;
  description: string;
  focus: string;
  urgency: string;
  searchType: string;
}

interface SearchAreaMapProps {
  location: {
    city: string;
    state: string;
    zipcode?: string;
  };
  searchAreas: SearchArea[];
  petName?: string;
}

export default function SearchAreaMap({ location, searchAreas, petName }: SearchAreaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Load Leaflet dynamically
    const loadMap = async () => {
      try {
        // Check if Leaflet is already loaded
        if ((window as any).L) {
          initializeMap((window as any).L);
          return;
        }

        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          initializeMap((window as any).L);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error loading map:', error);
      }
    };

    const initializeMap = (L: any) => {
      if (!mapRef.current) return;

      // Geocode location (simplified - in production use a geocoding API)
      // For now, use a default center (you'd geocode the city/state)
      const center: [number, number] = [34.2009, -86.1536]; // Default to Alabama center
      
      // Initialize map
      const mapInstance = L.map(mapRef.current).setView(center, 12);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance);

      setMap(mapInstance);

      // Add center marker
      const centerMarker = L.marker(center, {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background: #ef4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(mapInstance);

      centerMarker.bindPopup(`
        <strong>Where ${petName || 'your pet'} was lost</strong><br>
        ${location.city}, ${location.state}
      `);

      // Add search area circles
      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
      const newCircles: any[] = [];
      const newMarkers: any[] = [];

      searchAreas.forEach((area, index) => {
        // Convert radius from miles to meters (approximate)
        const radiusMeters = area.radius * 1609.34;

        // Create circle for search area
        const circle = L.circle(center, {
          radius: radiusMeters,
          color: colors[index % colors.length],
          fillColor: colors[index % colors.length],
          fillOpacity: 0.2,
          weight: 2
        }).addTo(mapInstance);

        circle.bindPopup(`
          <strong>${area.description}</strong><br>
          Priority: ${area.priority}<br>
          Urgency: ${area.urgency}<br>
          <small>${area.focus}</small>
        `);

        newCircles.push(circle);

        // Add marker on the circle edge (north)
        const markerLat = center[0] + (radiusMeters / 111320); // Approximate conversion
        const marker = L.marker([markerLat, center[1]], {
          icon: L.divIcon({
            className: 'area-marker',
            html: `<div style="background: ${colors[index % colors.length]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; white-space: nowrap; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${area.radius} mi</div>`,
            iconSize: [60, 20],
            iconAnchor: [30, 10]
          })
        }).addTo(mapInstance);

        marker.bindPopup(area.description);
        newMarkers.push(marker);
      });

      setCircles(newCircles);
      setMarkers(newMarkers);

      // Fit map to show all circles
      if (newCircles.length > 0) {
        const group = new L.featureGroup(newCircles);
        mapInstance.fitBounds(group.getBounds().pad(0.1));
      }
    };

    loadMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [location, searchAreas]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Search Areas Map
        </h3>
        <div className="text-sm text-gray-600">
          {location.city}, {location.state}
        </div>
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg border-2 border-gray-200 shadow-lg"
        style={{ minHeight: '400px' }}
      />
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800 font-semibold mb-2">📍 Red marker = Where pet was lost</p>
        <div className="space-y-1 text-xs text-blue-700">
          {searchAreas.map((area, idx) => {
            const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
            return (
              <div key={idx} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white" 
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span><strong>Priority {area.priority}:</strong> {area.description} - {area.focus}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


