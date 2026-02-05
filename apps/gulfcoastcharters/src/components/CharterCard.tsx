import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, Award, User, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/AppContext';
import SocialShare from './SocialShare';
import OptimizedImage from './OptimizedImage';
import ClaimListingModal from './ClaimListingModal';
import CaptainVerificationBadges from './CaptainVerificationBadges';
import CompleteBookingFlow from './booking/CompleteBookingFlow';
import EnhancedBookingModal from './booking/EnhancedBookingModal';
import { FavoriteButton } from './FavoriteButton';
import { WaitlistModal } from './WaitlistModal';
import { useUserContext } from '@/contexts/UserContext';
import PriceAlertButton from './PriceAlertButton';
import CaptainWeatherBadge from './CaptainWeatherBadge';



interface CharterCardProps {
  id: string;
  businessName: string;
  captainName: string;
  captainId?: string;
  location: string;
  city: string;
  boatType: string;
  boatLength: number;
  maxPassengers: number;
  priceHalfDay?: number;
  priceFullDay?: number;
  rating: number;
  reviewCount?: number;
  image?: string;
  isFeatured?: boolean;
  isScraped?: boolean;
  isClaimed?: boolean;
}






const CharterCard = memo(function CharterCard(props: CharterCardProps) {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const { addToCompare, compareCharters } = useAppContext();
  const { user } = useUserContext();
  const isInCompare = compareCharters.includes(props.id);



  const handleViewDetails = () => {
    window.location.hash = `#charter/${props.id}`;
  };

  const handleContact = () => {
    window.location.hash = `#contact/${props.id}`;
  };

  const handleCompare = () => {
    addToCompare(props.id);
  };


  return (
    <>
      <div data-testid="charter-card" className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 ${props.isFeatured ? 'ring-2 ring-purple-500' : ''}`}>

        {props.isFeatured && (
          <div className="gradient-primary text-white text-xs font-bold px-3 py-1.5 text-center">
            FEATURED
          </div>
        )}
        {props.isScraped && !props.isClaimed && (
          <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 text-center flex items-center justify-center gap-2">
            <Award className="w-3 h-3" />
            UNCLAIMED - Own this business?
          </div>
        )}
        {props.isClaimed && (
          <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 text-center flex items-center justify-center gap-2">
            <Award className="w-3 h-3" />
            VERIFIED BUSINESS
          </div>
        )}


        <div className="relative h-48 overflow-hidden bg-gray-200">
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton charterId={props.id} userId={user?.id} />
          </div>
          {props.image ? (
            <OptimizedImage 
              src={props.image} 
              alt={props.businessName}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>


        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{props.businessName}</h3>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-600 font-medium">Captain {props.captainName}</p>
            {props.captainId && (
              <Link 
                to={`/captain/${props.captainId}`}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <User className="w-3 h-3" />
                View Profile
              </Link>
            )}
          </div>
          <div className="mb-3">
            <CaptainVerificationBadges
              isVerified={props.isClaimed}
              isTopRated={props.rating >= 4.8}
              isQuickResponder={true}
              safetyScore={100}
              yearsExperience={10}
            />
          </div>
          <p className="text-sm text-gray-600 mb-3">{props.city}, {props.location}</p>


          {props.captainId && (
            <div className="mb-3">
              <CaptainWeatherBadge 
                captainId={props.captainId} 
                location={props.location}
                compact={true}
              />
            </div>
          )}

          

          
          <div className="flex items-center mb-4">
            <span className="text-amber-400 mr-1">★</span>
            <span className="font-bold text-gray-900">{props.rating.toFixed(1)}</span>
            <span className="text-gray-500 text-sm ml-1">({props.reviewCount})</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <div className="text-gray-600 font-medium">{props.boatType}</div>
            <div className="text-gray-600">{props.boatLength}ft</div>
            <div className="text-gray-600">Up to {props.maxPassengers}</div>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Half Day:</span>
              <span className="font-bold text-purple-600">${props.priceHalfDay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Full Day:</span>
              <span className="font-bold text-purple-600">${props.priceFullDay}</span>
            </div>
          </div>

          {props.isScraped && !props.isClaimed && (
            <button
              onClick={() => setShowClaimModal(true)}
              className="w-full mb-3 bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 rounded-xl transition font-semibold flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" />
              Claim This Listing
            </button>
          )}

          <div className="flex gap-2 mb-3">
            <button
              onClick={handleCompare}
              disabled={isInCompare}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
                isInCompare 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              {isInCompare ? 'In Compare' : 'Compare'}
            </button>
            <SocialShare 
              title={props.businessName}
              description={`${props.boatType} charter with Captain ${props.captainName} in ${props.city}, ${props.location}`}
            />
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowBookingModal(true)}
              className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-xl transition font-semibold hover:bg-green-700 shadow-md"
            >
              Book Now
            </button>
            {props.captainId && (
              <Link
                to={`/messages?captain=${props.captainId}`}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-xl transition font-semibold hover:bg-blue-700 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
              </Link>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={handleViewDetails}
              className="flex-1 gradient-primary text-white py-2.5 px-4 rounded-xl transition font-semibold hover:opacity-90 shadow-md text-sm"
            >
              Details
            </button>
            <PriceAlertButton
              charterId={props.id}
              charterName={props.businessName}
              currentPrice={props.priceFullDay || 0}
            />
          </div>

          <button
            onClick={() => setShowWaitlistModal(true)}
            className="w-full bg-amber-600 text-white py-2.5 px-4 rounded-xl transition font-semibold hover:bg-amber-700 shadow-md text-sm"
          >
            Join Waitlist
          </button>


        </div>
      </div>
      
      <ClaimListingModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        listingId={props.id}
        listingName={props.businessName}
      />
      
      <EnhancedBookingModal
        charter={{
          id: props.id,
          name: props.businessName,
          priceHalfDay: props.priceHalfDay || 0,
          priceFullDay: props.priceFullDay || 0
        }}
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />

      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        charterId={props.id}
        charterName={props.businessName}
        userId={user?.id}
      />

    </>

  );

});

export default CharterCard;
