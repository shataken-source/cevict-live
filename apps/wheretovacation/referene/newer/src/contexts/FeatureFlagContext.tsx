import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
}

interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  isFeatureEnabled: (featureId: string) => boolean;
  refreshFlags: () => Promise<void>;
  loading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: {},
  isFeatureEnabled: () => true,
  refreshFlags: async () => {},
  loading: true,
});

export const useFeatureFlags = () => useContext(FeatureFlagContext);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadFlags = async () => {
    try {
      // Check if Supabase is properly configured
      if (!supabase) {
        console.warn('Supabase not configured, using default feature flags');
        setFlags({});
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('feature-flag-manager', {
        body: { action: 'getAll' }
      });

      // If edge function doesn't exist or returns error, silently fail with defaults
      if (error) {
        console.warn('Feature flags not available, using defaults:', error.message);
        setFlags({});
        setLoading(false);
        return;
      }

      const flagMap: Record<string, boolean> = {};
      (data?.flags || []).forEach((flag: FeatureFlag) => {
        flagMap[flag.id] = flag.enabled;
      });

      setFlags(flagMap);
    } catch (error) {
      console.warn('Failed to load feature flags, using defaults');
      // Default all features to enabled if loading fails
      setFlags({});
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadFlags();
  }, []);

  const isFeatureEnabled = (featureId: string): boolean => {
    // If flags haven't loaded yet or flag doesn't exist, default to enabled
    return flags[featureId] !== false;
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, isFeatureEnabled, refreshFlags: loadFlags, loading }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};
