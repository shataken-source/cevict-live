'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface LocationContextType {
  zipCode: string;
  setZipCode: (zip: string) => void;
  locationName: string;
  setLocationName: (name: string) => void;
  coordinates: { lat: number; lng: number } | null;
  setCoordinates: (coords: { lat: number; lng: number } | null) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [zipCode, setZipCode] = useState('82190'); // Default to Yellowstone
  const [locationName, setLocationName] = useState('Yellowstone National Park, WY');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>({ lat: 44.5, lng: -110.0 });

  return (
    <LocationContext.Provider value={{
      zipCode,
      setZipCode,
      locationName,
      setLocationName,
      coordinates,
      setCoordinates
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
