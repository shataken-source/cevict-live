import { useAppStore } from '@/stores/appStore';
import GoogleAdSense from './GoogleAdSense';
import AffiliateShoppingBanner from './AffiliateShoppingBanner';
import { useAdTracking } from '@/hooks/useAdTracking';

export default function AdBanner() {
  const paidAds = useAppStore((state) => state.paidAds);
  const hasActivePaidAd = useAppStore((state) => state.hasActivePaidAd);


  // Find active hero ad
  const activeAd = paidAds.find(ad => ad.type === 'hero' && ad.active);

  // Track ad impression and clicks
  const { trackClick } = useAdTracking({
    businessId: activeAd?.businessId || '',
    businessName: activeAd?.businessName || '',
    adType: 'banner',
    adCost: activeAd?.cost || 0
  });

  const handleAdClick = () => {
    trackClick();
    // Additional click handling can go here
  };

  // If there's a paid business ad, show it
  if (activeAd) {
    return (
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-xs text-gray-500 mb-2">Sponsored</div>
            <h3 className="text-2xl font-bold text-blue-900 mb-2">{activeAd.businessName}</h3>
            <p className="text-gray-600 mb-4">Premium Charter Services - Book Your Adventure Today!</p>
            <button 
              onClick={handleAdClick}
              className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no paid ads, show affiliate shopping banner as fallback
  return <AffiliateShoppingBanner />;
}

