import { useState } from 'react';

interface BiddingModalProps {
  placementType: string;
  currentBid: number;
  onClose: () => void;
}

export default function BiddingModal({ placementType, currentBid, onClose }: BiddingModalProps) {
  const [bidAmount, setBidAmount] = useState(currentBid + 50);
  const [listingId, setListingId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bidAmount <= currentBid) {
      alert('Your bid must be higher than the current bid.');
      return;
    }

    // Bid submitted successfully
    alert(`Bid of $${bidAmount}/month submitted successfully! You'll be notified if you win.`);
    onClose();
  };

  const getPlacementName = () => {
    switch (placementType) {
      case 'hero': return 'Hero Banner';
      case 'sidebar': return 'Sidebar Spot';
      case 'featured': return 'Featured Listing';
      default: return 'Ad Placement';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Place Bid</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-2">Placement: <span className="font-semibold">{getPlacementName()}</span></p>
          <p className="text-gray-600">Current Bid: <span className="font-semibold">${currentBid}/month</span></p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Your Listing ID</label>
            <input
              type="text"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              required
              placeholder="Enter your charter listing ID"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Your Bid ($/month)</label>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              required
              min={currentBid + 1}
              step="10"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">Minimum bid: ${currentBid + 1}</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-900 hover:bg-blue-800 text-white py-2 rounded-lg font-semibold transition"
            >
              Submit Bid
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
