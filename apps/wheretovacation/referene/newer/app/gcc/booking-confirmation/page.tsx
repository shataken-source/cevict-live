import { Button } from '@/components/ui/button';
import { Anchor, CheckCircle, Phone, Mail, Calendar, MapPin, Users, Star, ArrowRight, Home, CloudRain, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import GCCNavigation, { GCCFooter } from '@/components/GCCNavigation';

export default function GCCBookingConfirmationPage() {
  // In a real app, this would come from URL params or state
  const bookingDetails = {
    tripType: 'Half Day Inshore Fishing',
    date: 'March 15, 2024',
    time: '7:00 AM',
    duration: '4 hours',
    guests: 4,
    captain: 'Captain Michael Thompson',
    boat: 'Sea Hunter 32',
    location: 'Orange Beach Marina',
    totalPaid: '$600',
    confirmationNumber: 'GCC-2024-0315-789'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <GCCNavigation currentPage="booking" />
      
      {/* Success Header */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Booking Confirmed!</h1>
            <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
              Your Gulf Coast fishing adventure is all set. We've sent a confirmation email with all the details.
            </p>
            <div className="bg-white/20 backdrop-blur rounded-lg px-6 py-3 inline-block">
              <p className="text-lg font-mono">Confirmation: {bookingDetails.confirmationNumber}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Details */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Trip Details */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Trip Details</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Trip Type:</span>
                  <span className="font-medium text-gray-900">{bookingDetails.tripType}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">{bookingDetails.date}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium text-gray-900">{bookingDetails.time}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">{bookingDetails.duration}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-medium text-gray-900">{bookingDetails.guests}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="font-bold text-green-600 text-lg">{bookingDetails.totalPaid}</span>
                </div>
              </div>
            </div>

            {/* Captain & Boat Info */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Captain & Boat</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Captain:</span>
                  <span className="font-medium text-gray-900">{bookingDetails.captain}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Boat:</span>
                  <span className="font-medium text-gray-900">{bookingDetails.boat}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Departure:</span>
                  <span className="font-medium text-gray-900">{bookingDetails.location}</span>
                </div>
                <div className="flex items-center gap-2 py-3">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-gray-600">Captain Rating:</span>
                  <span className="font-medium text-gray-900">4.9/5 (127 reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* What to Bring Reminder */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Anchor className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">Don't Forget to Pack!</h3>
                <p className="text-blue-700 mb-3">
                  Make sure you have everything you need for a successful day on the water.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/gcc/what-to-bring">
                    View What to Bring Checklist
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Promotion Section */}
      <section className="py-16 bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CloudRain className="w-6 h-6 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-800 mb-2">Weather Backup Plan</h3>
                    <p className="text-blue-700 mb-3">
                      If weather forces us to cancel your charter, don't worry! We've partnered with 
                      WhereToVacation.com to provide you with a complete Rainy Day Guide featuring 
                      50+ indoor activities to save your vacation day.
                    </p>
                    <Button asChild variant="outline" size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                      <Link href="/rainy-day-guide" target="_blank" rel="noopener noreferrer">
                        Get Rainy Day Guide
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Calendar className="w-6 h-6 text-gray-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Weather Policy</h3>
                    <p className="text-gray-700 mb-3">
                      If we cancel due to weather, you'll receive a 100% refund or the option to 
                      reschedule. Most weather delays are only 1-2 hours, so we may be able to 
                      still get you fishing!
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span>Call for weather updates</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Decisions made by 6 AM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Home className="w-8 h-8" />
                  <h2 className="text-3xl font-bold">Need More Help Planning Your Trip?</h2>
                </div>
                <p className="text-teal-100 mb-6 text-lg">
                  Your fishing adventure is booked, but there's so much more to explore on the Alabama Gulf Coast! 
                  Find the perfect vacation rental, discover local restaurants, and get insider tips from our local team.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Complete vacation rental checklist</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Local's guide to the best restaurants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Top 5 things to do on the Gulf Coast</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Money-saving local tips</span>
                  </div>
                </div>
                <Button asChild size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
                  <Link href="https://wheretovacation.com" target="_blank" rel="noopener noreferrer">
                    Visit WhereToVacation.com
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">What You'll Find on WhereToVacation.com</h3>
                <ul className="space-y-3 text-teal-100">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Vacation rental checklist with everything you need to pack</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Local seafood market recommendations (better prices than grocery stores!)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Beach day setup guide to keep sand out of your rental</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Emergency preparation and local contact information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-white rounded-full mt-2" />
                    <span>Seasonal guides for the best times to visit</span>
                  </li>
                </ul>
                <div className="mt-6 p-4 bg-white/20 rounded-lg">
                  <p className="text-sm">
                    <strong>From our Albertville, AL team to you:</strong> We're locals who know the Gulf Coast inside and out!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Important Information */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Important Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-3">Cancellation Policy</h3>
              <p className="text-red-700 text-sm">
                Free cancellation up to 48 hours before your trip. Cancellations within 48 hours are subject to a 50% fee. 
                No-shows will be charged the full amount.
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-3">Weather Policy</h3>
              <p className="text-yellow-700 text-sm">
                Trips may be cancelled due to unsafe weather conditions. The captain's decision is final. 
                Full refunds provided for weather-related cancellations.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-blue-800 mb-3">Contact Information</h3>
              <div className="space-y-2 text-blue-700 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>(251) 555-0123</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>info@gulfcoastcharters.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Orange Beach Marina, AL</span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-green-800 mb-3">What's Included</h3>
              <ul className="space-y-1 text-green-700 text-sm">
                <li>• All fishing licenses and permits</li>
                <li>• Professional rods, reels, and tackle</li>
                <li>• Bait and ice</li>
                <li>• Fish cleaning and bagging</li>
                <li>• USCG licensed captain</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
