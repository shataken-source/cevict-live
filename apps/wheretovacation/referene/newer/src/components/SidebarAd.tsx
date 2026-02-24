import { useAppContext } from '@/contexts/AppContext';
import GoogleAdSense from './GoogleAdSense';
import { useAdTracking } from '@/hooks/useAdTracking';

export default function SidebarAd() {
  const { paidAds, hasActivePaidAd } = useAppContext();

  // Find active sidebar ad
  const activeAd = paidAds.find(ad => ad.type === 'sidebar' && ad.active);

  // Track ad impression and clicks
  const { trackClick } = useAdTracking({
    businessId: activeAd?.businessId || '',
    businessName: activeAd?.businessName || '',
    adType: 'sidebar',
    adCost: activeAd?.cost || 0
  });

  const handleAdClick = () => {
    trackClick();
  };

  // If there's a paid business ad, show it
  if (activeAd) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 sticky top-20 border-2 border-blue-500">
        <div className="text-xs text-gray-500 mb-3 text-center">Sponsored</div>
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg p-6 text-white text-center mb-4">
          <h3 className="text-xl font-bold mb-2">{activeAd.businessName}</h3>
          <p className="text-sm mb-4">Your Trusted Charter Partner</p>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center text-gray-700">
            <span className="mr-2">✓</span>
            <span>Licensed & Insured</span>
          </div>
          <div className="flex items-center text-gray-700">
            <span className="mr-2">✓</span>
            <span>Expert Captains</span>
          </div>
          <div className="flex items-center text-gray-700">
            <span className="mr-2">✓</span>
            <span>Premium Equipment</span>
          </div>
        </div>
        <button 
          onClick={handleAdClick}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold mt-4 transition"
        >
          Book Now
        </button>
      </div>
    );
  }

  // Otherwise, show Google AdSense as fallback
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
      <div className="text-xs text-gray-500 mb-2 text-center">Advertisement</div>
      <div className="min-h-[600px] flex items-center justify-center">
        <GoogleAdSense format="vertical" />
      </div>
    </div>
  );
}

