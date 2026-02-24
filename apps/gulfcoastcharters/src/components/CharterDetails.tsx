import { mockCharters } from '../data/mockCharters';
import { useAppContext } from '../contexts/AppContext';
import { ReviewSystem } from './ReviewSystem';
import { ReviewForm } from './ReviewForm';
import ComprehensiveWeatherDisplay from './ComprehensiveWeatherDisplay';
import BookingCalendar from './BookingCalendar';
import BookingModal from './BookingModal';
import ChatWidget from './ChatWidget';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';

interface CharterDetailsProps {
  charterId: string;
}

export default function CharterDetails({ charterId }: CharterDetailsProps) {
  const charter = mockCharters.find(c => c.id === charterId);
  const { getReviewsByCharter, addReview } = useAppContext();
  const charterReviews = getReviewsByCharter(charterId);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>();
  const [prefilledTimeSlot, setPrefilledTimeSlot] = useState<string | undefined>();

  if (!charter) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold">Charter not found</h2>
      </div>
    );
  }

  const handleBooking = () => {
    setShowBookingModal(true);
  };


  const handleGetDirections = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const destination = `${charter.city}, ${charter.location}`;

          // Show options for Google Maps or Waze
          const useGoogleMaps = window.confirm(
            'Choose your navigation app:\n\nOK = Google Maps\nCancel = Waze'
          );

          if (useGoogleMaps) {
            // Google Maps URL with directions
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${encodeURIComponent(destination)}`;
            window.open(googleMapsUrl, '_blank');
          } else {
            // Waze URL with directions
            const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes&q=${encodeURIComponent(destination)}`;
            window.open(wazeUrl, '_blank');
          }
        },
        (error) => {
          // If user denies location or error occurs, just open with destination
          const destination = `${charter.city}, ${charter.location}`;
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
          window.open(googleMapsUrl, '_blank');
        }
      );
    } else {
      // Geolocation not supported, just open destination
      const destination = `${charter.city}, ${charter.location}`;
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
      window.open(googleMapsUrl, '_blank');
    }
  };


  const handleReviewSubmit = (reviewData: any) => {
    addReview(charterId, reviewData);
  };


  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => window.location.hash = '#'}
          className="text-blue-900 hover:underline mb-4"
        >
          ← Back to Listings
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <img
              src={charter.image}
              alt={charter.businessName}
              className="w-full h-96 object-cover rounded-lg shadow-lg"
            />
          </div>

          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{charter.businessName}</h1>
            <p className="text-xl text-gray-600 mb-4">Captain {charter.captainName}</p>

            <div className="flex items-center mb-4">
              <span className="text-yellow-500 text-2xl mr-2">★</span>
              <span className="text-2xl font-semibold">{charter.rating.toFixed(1)}</span>
              <span className="text-gray-500 ml-2">({charter.reviewCount + charterReviews.length} reviews)</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Pricing</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Half Day (4 hours):</span>
                  <span className="text-2xl font-bold text-blue-900">${charter.priceHalfDay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Full Day (8 hours):</span>
                  <span className="text-2xl font-bold text-blue-900">${charter.priceFullDay}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCalendarDialog(true)}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white py-4 px-6 rounded-lg text-xl font-semibold transition mb-4 flex items-center justify-center gap-2"
            >
              <CalendarIcon className="h-5 w-5" />
              Check availability & book
            </button>
            <button
              onClick={handleBooking}
              className="w-full border border-blue-900 text-blue-900 hover:bg-blue-50 py-3 px-6 rounded-lg font-semibold transition"
            >
              Contact Captain
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
              <div className="space-y-2 text-sm">
                {charter.contactPreferences.email && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">
                      {charter.useCustomEmail && charter.customEmail ? charter.customEmail : charter.captainEmail}
                    </span>
                  </div>
                )}
                {charter.contactPreferences.phone && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">{charter.captainPhone}</span>
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>

        {/* Comprehensive Weather Display */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6">Weather & Marine Conditions</h3>
          <ComprehensiveWeatherDisplay
            latitude={(charter as any).latitude || 29.3}
            longitude={(charter as any).longitude || -94.8}
            location={`${charter.city}, ${charter.location}`}
          />
        </div>

        {/* Get Directions Button */}
        <div className="mb-8">
          <button
            onClick={handleGetDirections}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-lg text-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            How to Get Here
          </button>
        </div>



        <div className="bg-gray-50 rounded-lg p-8 mb-8">
          <h3 className="text-2xl font-bold mb-4">About This Charter</h3>
          <p className="text-gray-700 leading-relaxed">
            Join Captain {charter.captainName} for an unforgettable fishing experience on the Gulf Coast.
            Our {charter.boatLength}ft {charter.boatType} vessel is equipped with top-of-the-line fishing gear
            and safety equipment. Whether you're a seasoned angler or first-timer, we'll make sure you have
            an amazing day on the water. We specialize in targeting a variety of species and provide all
            necessary equipment, bait, and tackle.
          </p>
        </div>


        {/* Reviews Section */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6">Customer Reviews</h3>
          <ReviewSystem charterId={charterId} />
        </div>


        {/* Live booking calendar (availability, holds, waitlist) */}
        <BookingCalendar
          open={showCalendarDialog}
          onOpenChange={setShowCalendarDialog}
          charter={charter}
          captainId={(charter as any).captain_id ?? charter.id}
          onTimeSlotSelect={(date, slot) => {
            setShowCalendarDialog(false);
            setPrefilledDate(date.toISOString().split('T')[0]);
            setPrefilledTimeSlot(slot?.time_slot ?? undefined);
            setShowBookingModal(true);
          }}
        />

        {/* Booking Modal */}
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setPrefilledDate(undefined);
            setPrefilledTimeSlot(undefined);
          }}
          charter={charter}
          initialDate={prefilledDate}
          initialTimeSlot={prefilledTimeSlot}
        />

        {/* Chat Widget */}
        <ChatWidget
          charterId={charterId}
          charterName={charter.businessName}
          customerName="Guest"
        />
      </div>
    </div>
  );
}
