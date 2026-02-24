import { useAppContext } from '@/contexts/AppContext';
import GoogleAdSense from './GoogleAdSense';
import { useAdTracking } from '@/hooks/useAdTracking';

export default function FeaturedAdCard() {
  const { paidAds } = useAppContext();
  const activeAd = paidAds.find(ad => ad.type === 'featured' && ad.active);
  const { trackClick } = useAdTracking({
    businessId: activeAd?.businessId || '',
    businessName: activeAd?.businessName || '',
    adType: 'featured',
    adCost: activeAd?.cost || 0
  });

  if (activeAd) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg overflow-hidden border-2 border-purple-400">
        <div className="gradient-primary text-white text-xs font-bold px-3 py-1.5 text-center">
          SPONSORED
        </div>
        <div className="p-6 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{activeAd.businessName}</h3>
          <p className="text-gray-700 mb-4">Premium Charter Experience</p>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p>✓ Top-Rated Service</p>
            <p>✓ Professional Crew</p>
            <p>✓ Best Equipment</p>
          </div>
          <button 
            onClick={trackClick}
            className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold transition w-full hover:opacity-90 shadow-md"
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
      <div className="text-xs text-gray-500 mb-2 text-center">Advertisement</div>
      <GoogleAdSense format="rectangle" />
    </div>
  );
}
