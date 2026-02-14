import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface AdTrackingProps {
  businessId: string;
  businessName: string;
  adType: 'banner' | 'sidebar' | 'featured';
  adCost: number;
}

export const useAdTracking = ({ businessId, businessName, adType, adCost }: AdTrackingProps) => {
  const impressionTracked = useRef(false);

  const trackImpression = async () => {
    try {
      await supabase.functions.invoke('track-ad-event', {
        body: {
          businessId,
          businessName,
          adType,
          eventType: 'impression',
          adCost
        }
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  useEffect(() => {
    if (!impressionTracked.current) {
      trackImpression();
      impressionTracked.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackClick = async () => {
    try {
      await supabase.functions.invoke('track-ad-event', {
        body: {
          businessId,
          businessName,
          adType,
          eventType: 'click',
          adCost
        }
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  return { trackClick };
};
