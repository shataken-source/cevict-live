import { X, Users, MapPin, Star, Calendar, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SocialShare from './SocialShare';

interface CharterDetailModalProps {
  charter: any;
  onClose: () => void;
  onBook: () => void;
}

export default function CharterDetailModal({ charter, onClose, onBook }: CharterDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-t-4 border-t-blue-600" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={charter.image} alt={charter.name} className="w-full h-80 object-cover rounded-t-2xl" />
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/40 to-transparent p-4">
            <div className="flex justify-between items-start">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                Gulf Coast Charters
              </div>
              <button onClick={onClose} className="bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
            <Star className="w-5 h-5 fill-white" />
            {charter.rating} Rating
          </div>
        </div>


        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-4xl font-bold mb-2">{charter.name}</h2>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">{charter.location}</span>
              </div>
              <div className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                {charter.type}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">${charter.price}</div>
              <div className="text-gray-500">per day</div>
            </div>
          </div>

          <div className="border-t border-b border-gray-200 py-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-500">Capacity</div>
                  <div className="font-semibold">{charter.guests} Guests</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Anchor className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-500">Type</div>
                  <div className="font-semibold">{charter.type}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-3">Description</h3>
            <p className="text-gray-700 leading-relaxed">{charter.description}</p>
          </div>

          {/* Social Sharing Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Love this charter?</h4>
                <p className="text-sm text-gray-600">Share it with your friends!</p>
              </div>
              <SocialShare
                title={`Check out ${charter.name} - Amazing Charter Experience!`}
                description={`${charter.description.substring(0, 150)}... Located in ${charter.location}. Rated ${charter.rating} stars!`}
                url={window.location.href}
                imageUrl={charter.image}
                hashtags={['CharterBoat', charter.type.replace(/\s+/g, ''), charter.location.split(',')[0].replace(/\s+/g, '')]}
                type="charter"
              />
            </div>
          </div>


          <div className="flex gap-4">
            <Button size="lg" className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg py-6" onClick={onBook}>
              <Calendar className="w-5 h-5 mr-2" />
              Book Now
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-lg py-6" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
