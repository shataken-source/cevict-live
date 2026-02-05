import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AdSystemPriorityProps {
  placement: 'hero' | 'sidebar' | 'in-grid' | 'footer';
  className?: string;
}

export default function AdSystemPriority({ placement, className = '' }: AdSystemPriorityProps) {
  const [ad, setAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAd();
  }, [placement]);

  const loadAd = async () => {
    try {
      // Priority 1: Captain ads
      const { data: captainAd } = await supabase
        .from('captain_ads')
        .select('*')
        .eq('placement', placement)
        .eq('active', true)
        .order('bid_amount', { ascending: false })
        .limit(1)
        .single();

      if (captainAd) {
        setAd({ type: 'captain', ...captainAd });
        trackImpression(captainAd.id, 'captain');
        setLoading(false);
        return;
      }

      // Priority 2: Google Ads (if enabled)
      const { data: settings } = await supabase
        .from('site_settings')
        .select('google_ads_enabled')
        .single();

      if (settings?.google_ads_enabled) {
        setAd({ type: 'google', placement });
        setLoading(false);
        return;
      }

      // Priority 3: Default admin ads
      const { data: defaultAd } = await supabase
        .from('default_ads')
        .select('*')
        .eq('placement', placement)
        .eq('active', true)
        .limit(1)
        .single();

      if (defaultAd) {
        setAd({ type: 'default', ...defaultAd });
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load ad:', error);
    }
    setLoading(false);
  };

  const trackImpression = async (adId: string, adType: string) => {
    await supabase.from('ad_impressions').insert({
      ad_id: adId,
      ad_type: adType,
      placement
    });
  };

  if (loading) return <div className={`animate-pulse bg-gray-200 ${className}`} />;
  if (!ad) return null;

  if (ad.type === 'captain') {
    return (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className={className}>
        <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover rounded" />
      </a>
    );
  }

  if (ad.type === 'google') {
    return <div className={className} dangerouslySetInnerHTML={{ __html: '<!-- Google Ad -->' }} />;
  }

  if (ad.type === 'default') {
    return (
      <div className={`${className} bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-lg`}>
        <h3 className="text-xl font-bold mb-2">{ad.title}</h3>
        <p className="mb-4">{ad.description}</p>
        <a href={ad.link_url} className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100">
          {ad.cta_text}
        </a>
      </div>
    );
  }

  return null;
}
