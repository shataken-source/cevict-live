import BannerPlaceholder from '@/components/BannerPlaceholder';

export default function FreePicksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BannerPlaceholder position="header" adSlot="prognostication-free-picks-header" />
      <div className="py-12">
        <div className="container mx-auto px-4">
        <h1 className="text-5xl font-bold text-center mb-12">Free Picks</h1>
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-3">Coming Soon!</h2>
          <p className="text-gray-600 mb-6">Free picks will be posted here regularly.</p>
          <a href="/premium-picks" className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold inline-block">
            Get Premium Access
          </a>
        </div>
        <BannerPlaceholder position="in-content" adSlot="prognostication-free-picks-incontent" className="my-8" />
      </div>
      </div>
      <BannerPlaceholder position="footer" adSlot="prognostication-free-picks-footer" />
    </div>
  )
}
