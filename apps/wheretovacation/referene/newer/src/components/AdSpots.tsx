import { useState } from 'react';
import BiddingModal from './BiddingModal';

export default function AdSpots() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState({ type: '', currentBid: 0 });

  const handleBidClick = (type: string, currentBid: number) => {
    setSelectedPlacement({ type, currentBid });
    setShowModal(true);
  };

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Premium Advertising Spots
        </h2>
        <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          Boost your charter business visibility! Bid on premium ad placements to reach thousands of potential customers.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-yellow-400">
            <div className="bg-yellow-400 text-gray-900 font-bold text-center py-2 rounded mb-4">
              HERO BANNER
            </div>
            <h3 className="text-xl font-bold mb-2">Top of Page</h3>
            <p className="text-gray-600 mb-4">Maximum visibility above all listings</p>
            <div className="text-2xl font-bold text-blue-900 mb-4">Current Bid: $500/mo</div>
            <button
              onClick={() => handleBidClick('hero', 500)}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition"
            >
              Place Bid
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="bg-blue-500 text-white font-bold text-center py-2 rounded mb-4">
              SIDEBAR SPOTS
            </div>
            <h3 className="text-xl font-bold mb-2">4 Positions Available</h3>
            <p className="text-gray-600 mb-4">Persistent visibility while browsing</p>
            <div className="text-2xl font-bold text-blue-900 mb-4">From $150/mo</div>
            <button
              onClick={() => handleBidClick('sidebar', 150)}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition"
            >
              Place Bid
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="bg-green-500 text-white font-bold text-center py-2 rounded mb-4">
              IN-GRID FEATURED
            </div>
            <h3 className="text-xl font-bold mb-2">Stand Out</h3>
            <p className="text-gray-600 mb-4">Highlighted among regular listings</p>
            <div className="text-2xl font-bold text-blue-900 mb-4">From $100/mo</div>
            <button
              onClick={() => handleBidClick('featured', 100)}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition"
            >
              Place Bid
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <BiddingModal
          placementType={selectedPlacement.type}
          currentBid={selectedPlacement.currentBid}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
