'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type EquipmentType = 'ampinvt' | 'victron' | 'sma' | 'none';

export interface LocationProfile {
  id: string;
  name: string;
  icon: string;
  zipCode: string;
  locationName: string;
  coordinates: { lat: number; lng: number } | null;
  equipment: {
    type: EquipmentType;
    name: string;
    mqttBroker?: string;
    mqttPort?: number;
    deviceId?: string;
  };
  notes?: string;
}

interface ProfileContextType {
  profiles: LocationProfile[];
  activeProfileId: string | null;
  activeProfile: LocationProfile | null;
  setActiveProfile: (id: string) => void;
  addProfile: (profile: Omit<LocationProfile, 'id'>) => void;
  updateProfile: (id: string, updates: Partial<LocationProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  isLoading: boolean;
}

const DEFAULT_PROFILES: LocationProfile[] = [
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    zipCode: '82190',
    locationName: 'Yellowstone National Park, WY',
    coordinates: { lat: 44.5, lng: -110.0 },
    equipment: {
      type: 'ampinvt',
      name: 'Ampinvt Charge Controller',
      mqttBroker: '192.168.1.100',
      mqttPort: 1883,
      deviceId: 'ampinvt-home',
    },
    notes: 'House solar system with AmpinVT controller',
  },
  {
    id: 'rv',
    name: 'RV / Camper',
    icon: '🚐',
    zipCode: '59758',
    locationName: 'West Yellowstone, MT',
    coordinates: { lat: 44.6624, lng: -111.1041 },
    equipment: {
      type: 'victron',
      name: 'Victron Inverter',
      mqttBroker: '192.168.4.1',
      mqttPort: 1883,
      deviceId: 'victron-rv',
    },
    notes: 'Camper setup with Victron inverter',
  },
];

const STORAGE_KEY = 'wildready_profiles';
const ACTIVE_PROFILE_KEY = 'wildready_active_profile';

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<LocationProfile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string | null>('home');
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const active = localStorage.getItem(ACTIVE_PROFILE_KEY);
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProfiles(parsed);
        } catch (e) {
          console.error('Failed to parse profiles:', e);
        }
      }
      
      if (active) {
        setActiveProfileId(active);
      }
      
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever profiles change
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }
  }, [profiles, isLoading]);

  // Save active profile
  useEffect(() => {
    if (!isLoading && activeProfileId && typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
    }
  }, [activeProfileId, isLoading]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  const setActiveProfile = useCallback((id: string) => {
    setActiveProfileId(id);
  }, []);

  const addProfile = useCallback((profile: Omit<LocationProfile, 'id'>) => {
    const id = `profile_${Date.now()}`;
    const newProfile: LocationProfile = { ...profile, id };
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(id);
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<LocationProfile>) => {
    setProfiles(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId(profiles[0]?.id || null);
    }
  }, [activeProfileId, profiles]);

  const duplicateProfile = useCallback((id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      const newProfile: LocationProfile = {
        ...profile,
        id: `profile_${Date.now()}`,
        name: `${profile.name} (Copy)`,
      };
      setProfiles(prev => [...prev, newProfile]);
    }
  }, [profiles]);

  return (
    <ProfileContext.Provider value={{
      profiles,
      activeProfileId,
      activeProfile,
      setActiveProfile,
      addProfile,
      updateProfile,
      deleteProfile,
      duplicateProfile,
      isLoading,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfiles must be used within a ProfileProvider');
  }
  return context;
}
