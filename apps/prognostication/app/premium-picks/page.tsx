import BannerPlaceholder from '@/components/BannerPlaceholder';

export default function PremiumPicksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <BannerPlaceholder position="header" adSlot="prognostication-premium-picks-header" />
      <div className="py-12">
        <div className="container mx-auto px-4">
        <h1 className="text-5xl font-bold text-center mb-6">Premium Picks</h1>
        <div className="text-center mb-12">
          <div className="bg-yellow-400 text-black inline-block px-8 py-4 rounded-lg">
            <p className="text-2xl font-bold">$29.99/month</p>
            <p className="text-sm">Cancel anytime</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-3xl font-bold mb-6 text-center">Premium Benefits</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div><h3 className="font-bold">Daily Premium Picks</h3><p className="text-gray-600">5-10 picks every day</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div><h3 className="font-bold">Advanced Analytics</h3><p className="text-gray-600">Detailed breakdowns</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div><h3 className="font-bold">SMS Alerts</h3><p className="text-gray-600">Instant notifications</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div><h3 className="font-bold">Performance Tracking</h3><p className="text-gray-600">Win rate & ROI stats</p></div>
            </div>
          </div>
          <div className="text-center mt-8">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-4 rounded-lg text-xl font-bold">
              Subscribe Now
            </button>
          </div>
        </div>
        <BannerPlaceholder position="in-content" adSlot="prognostication-premium-picks-incontent" className="my-8" />
      </div>
      </div>
      <BannerPlaceholder position="footer" adSlot="prognostication-premium-picks-footer" />
    </div>
  )
}
