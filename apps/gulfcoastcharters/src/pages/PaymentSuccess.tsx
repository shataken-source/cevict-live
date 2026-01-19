import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Mail, Calendar, Ship, MapPin, Home } from 'lucide-react';
import { sendBookingConfirmation } from '@/utils/emailNotifications';
import { awardLoyaltyPoints } from '@/utils/loyaltyRewards';
import { toast } from 'sonner';
import SocialShare from '@/components/SocialShare';



export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Get booking details from URL params or session storage
    const sessionId = searchParams.get('session_id');
    const bookingId = searchParams.get('booking_id');
    
    // In production, fetch booking details from backend using session_id
    // For now, retrieve from session storage
    const storedBooking = sessionStorage.getItem('pendingBooking');
    if (storedBooking) {
      const booking = JSON.parse(storedBooking);
      setBookingDetails(booking);
      
      // Award loyalty points for booking
      const userId = localStorage.getItem('userId') || booking.customerEmail;
      if (userId && booking.price) {
        awardLoyaltyPoints(userId, 'booking', booking.price, `Booking: ${booking.charterName}`);
      }
      
      // Send confirmation email
      if (!emailSent && booking.customerEmail) {
        sendBookingConfirmation({
          customerName: booking.customerName || 'Valued Customer',
          customerEmail: booking.customerEmail,
          bookingId: bookingId || `BK${Date.now()}`,
          charterName: booking.charterName,
          date: booking.date,
          time: booking.time || '9:00 AM',
          duration: booking.duration || '4 hours',
          totalPrice: `$${booking.price}`,
          captainName: booking.captainName || 'Your Captain',
          location: booking.location
        }).then(() => {
          setEmailSent(true);
          toast.success('Confirmation email sent! You earned loyalty points!');
        }).catch(err => {
          console.error('Failed to send confirmation email:', err);
        });
      }

      
      sessionStorage.removeItem('pendingBooking');
    }
  }, [searchParams, emailSent]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Booking Confirmed!
            </h1>
            <p className="text-xl text-gray-600">
              Your charter has been successfully booked
            </p>
          </div>

          {/* Success Image */}
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763262943756_ecad6eb2.webp"
            alt="Success"
            className="w-full h-48 object-cover rounded-lg mb-8"
          />

          {/* Booking Details Card */}
          {bookingDetails && (
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Booking Details</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Ship className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-medium">{bookingDetails.charterName}</p>
                    <p className="text-sm text-gray-600">{bookingDetails.boatType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-sm text-gray-600">{bookingDetails.date} at {bookingDetails.time}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-gray-600">{bookingDetails.location}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Email Confirmation Notice */}
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Confirmation Email Sent
                </h3>
                <p className="text-sm text-blue-800">
                  We've sent a confirmation email with all the details to your inbox. 
                  Please check your spam folder if you don't see it within a few minutes.
                </p>
              </div>
            </div>
          </Card>

          {/* Next Steps */}
          <Card className="p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">What's Next?</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Check your email for booking confirmation and captain contact details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>The captain will contact you 24-48 hours before your trip</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Arrive 15 minutes early at the departure location</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Bring sunscreen, camera, and get ready for an amazing adventure!</span>
              </li>
            </ul>
          </Card>

          {/* Social Sharing Section */}
          {bookingDetails && (
            <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-3">Share Your Adventure!</h3>
                <p className="text-gray-600 mb-4">
                  Let your friends know about your upcoming charter experience
                </p>
                <div className="flex justify-center">
                  <SocialShare
                    title={`Just booked an amazing charter with ${bookingDetails.charterName}!`}
                    description={`I'm going on a ${bookingDetails.duration} charter adventure on ${bookingDetails.date} in ${bookingDetails.location}. Can't wait for this ocean experience!`}
                    url={window.location.origin}
                    imageUrl="https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763262943756_ecad6eb2.webp"
                    hashtags={['CharterBooking', 'BoatLife', 'OceanAdventure', 'FishingTrip']}
                    type="booking"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Home className="w-5 h-5 mr-2" />
              Return to Home
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              size="lg"
            >
              Browse More Charters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
