"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { vacationProperties } from '@/lib/vacation-data';

export default function BookingClient() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('property');
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
    totalPrice: 0,
    paymentMethod: 'card'
  });
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingReference, setBookingReference] = useState('');

  useEffect(() => {
    if (propertyId) {
      const property = vacationProperties.find(p => p.id === propertyId);
      if (property) {
        setSelectedProperty(property);
        setBookingData(prev => ({ ...prev, totalPrice: property.price }));
      }
    }
  }, [propertyId]);

  const handleDateChange = (field: string, value: string) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotalPrice = () => {
    if (!selectedProperty || !bookingData.checkIn || !bookingData.checkOut) return 0;
    
    const checkIn = new Date(bookingData.checkIn);
    const checkOut = new Date(bookingData.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    return nights > 0 ? selectedProperty.price * nights : 0;
  };

  useEffect(() => {
    const total = calculateTotalPrice();
    setBookingData(prev => ({ ...prev, totalPrice: total }));
  }, [bookingData.checkIn, bookingData.checkOut, selectedProperty]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate booking reference
    const ref = 'WTV' + Date.now().toString().slice(-8);
    setBookingReference(ref);
    
    // Simulate booking process
    setBookingConfirmed(true);
    setBookingStep(4);
  };

  if (!selectedProperty && propertyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-xl">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!selectedProperty && !propertyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-blue-200 text-xl mb-8">
              Please search for a property first to begin the booking process.
            </p>
            <Link
              href="/search"
              className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
            >
              Search Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-white mb-4">Booking Confirmed!</h1>
            <p className="text-xl text-blue-200 mb-2">
              Your vacation has been successfully booked.
            </p>
            <p className="text-lg text-cyan-300 mb-8">
              Booking Reference: <span className="font-mono font-bold">{bookingReference}</span>
            </p>
            
            <div className="bg-white/5 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-xl font-bold text-white mb-4">Booking Details</h2>
              <div className="space-y-2 text-blue-200">
                <p><span className="font-semibold">Property:</span> {selectedProperty.name}</p>
                <p><span className="font-semibold">Destination:</span> {selectedProperty.destination}</p>
                <p><span className="font-semibold">Check-in:</span> {new Date(bookingData.checkIn).toLocaleDateString()}</p>
                <p><span className="font-semibold">Check-out:</span> {new Date(bookingData.checkOut).toLocaleDateString()}</p>
                <p><span className="font-semibold">Guests:</span> {bookingData.guests}</p>
                <p><span className="font-semibold">Total Paid:</span> ${bookingData.totalPrice.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Link
                href="/search"
                className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
              >
                Book Another Vacation
              </Link>
              <div className="block">
                <Link
                  href="/"
                  className="text-blue-300 hover:text-white underline"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Book Your Perfect Vacation
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Complete your booking for {selectedProperty.name}
          </p>
        </div>

        {/* Booking Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  bookingStep >= step 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-white/10 text-blue-300'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 ${bookingStep > step ? 'bg-cyan-500' : 'bg-white/10'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Booking Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
              <form onSubmit={handleSubmitBooking}>
                {/* Step 1: Property Details */}
                {bookingStep === 1 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Property Details</h2>
                    <div className="bg-white/5 rounded-lg p-6 mb-6">
                      <div className="flex gap-4 mb-4">
                        <div className="text-4xl">🏖️</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white">{selectedProperty.name}</h3>
                          <p className="text-blue-200">{selectedProperty.destination}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400">⭐</span>
                              <span className="text-white">{selectedProperty.rating}</span>
                            </div>
                            <div className="text-blue-300">
                              {selectedProperty.reviews} reviews
                            </div>
                            <div className="text-blue-300">
                              {selectedProperty.guests} guests max
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-blue-200 mb-4">{selectedProperty.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProperty.amenities.slice(0, 6).map((amenity, i) => (
                          <span key={i} className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-white font-medium mb-2">Check-in Date</label>
                        <input
                          type="date"
                          required
                          value={bookingData.checkIn}
                          onChange={(e) => handleDateChange('checkIn', e.target.value)}
                          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-white font-medium mb-2">Check-out Date</label>
                        <input
                          type="date"
                          required
                          value={bookingData.checkOut}
                          onChange={(e) => handleDateChange('checkOut', e.target.value)}
                          min={bookingData.checkIn}
                          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-2">Number of Guests</label>
                      <select
                        value={bookingData.guests}
                        onChange={(e) => setBookingData(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                      >
                        <option value={1}>1 Guest</option>
                        <option value={2}>2 Guests</option>
                        <option value={3}>3 Guests</option>
                        <option value={4}>4 Guests</option>
                        <option value={5}>5 Guests</option>
                        <option value={6}>6+ Guests</option>
                      </select>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      disabled={!bookingData.checkIn || !bookingData.checkOut}
                      className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Continue to Guest Information
                    </button>
                  </div>
                )}

                {/* Step 2: Guest Information */}
                {bookingStep === 2 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Guest Information</h2>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-white font-medium mb-2">First Name</label>
                        <input
                          type="text"
                          required
                          value={bookingData.firstName}
                          onChange={(e) => setBookingData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-white font-medium mb-2">Last Name</label>
                        <input
                          type="text"
                          required
                          value={bookingData.lastName}
                          onChange={(e) => setBookingData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-2">Email Address</label>
                      <input
                        type="email"
                        required
                        value={bookingData.email}
                        onChange={(e) => setBookingData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-2">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={bookingData.phone}
                        onChange={(e) => setBookingData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-2">Special Requests (Optional)</label>
                      <textarea
                        value={bookingData.specialRequests}
                        onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))}
                        rows={4}
                        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                        placeholder="Any special requirements or requests..."
                      />
                    </div>
                    
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setBookingStep(1)}
                        className="flex-1 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingStep(3)}
                        disabled={!bookingData.firstName || !bookingData.lastName || !bookingData.email}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Payment */}
                {bookingStep === 3 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Payment Information</h2>
                    <div className="bg-white/5 rounded-lg p-6 mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <input
                          type="radio"
                          id="card"
                          name="payment"
                          value="card"
                          checked={bookingData.paymentMethod === 'card'}
                          onChange={(e) => setBookingData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          className="w-4 h-4"
                        />
                        <label htmlFor="card" className="text-white flex items-center gap-2">
                          💳 Credit/Debit Card
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id="paypal"
                          name="payment"
                          value="paypal"
                          checked={bookingData.paymentMethod === 'paypal'}
                          onChange={(e) => setBookingData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          className="w-4 h-4"
                        />
                        <label htmlFor="paypal" className="text-white flex items-center gap-2">
                          🅿️ PayPal
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                      <p className="text-yellow-300 text-sm">
                        ⚠️ This is a demo booking. No actual payment will be processed.
                      </p>
                    </div>
                    
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setBookingStep(2)}
                        className="flex-1 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
                      >
                        Complete Booking
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-blue-200">
                  <span>Property</span>
                  <span className="text-white">{selectedProperty.name}</span>
                </div>
                <div className="flex justify-between text-blue-200">
                  <span>Destination</span>
                  <span className="text-white">{selectedProperty.destination}</span>
                </div>
                {bookingData.checkIn && (
                  <div className="flex justify-between text-blue-200">
                    <span>Check-in</span>
                    <span className="text-white">{new Date(bookingData.checkIn).toLocaleDateString()}</span>
                  </div>
                )}
                {bookingData.checkOut && (
                  <div className="flex justify-between text-blue-200">
                    <span>Check-out</span>
                    <span className="text-white">{new Date(bookingData.checkOut).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-blue-200">
                  <span>Guests</span>
                  <span className="text-white">{bookingData.guests}</span>
                </div>
                <div className="flex justify-between text-blue-200">
                  <span>Rate per night</span>
                  <span className="text-white">${selectedProperty.price.toLocaleString()}</span>
                </div>
                {calculateTotalPrice() > 0 && (
                  <>
                    <div className="border-t border-white/20 pt-3">
                      <div className="flex justify-between text-blue-200">
                        <span>Subtotal</span>
                        <span className="text-white">${calculateTotalPrice().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-blue-200">
                        <span>Taxes & Fees</span>
                        <span className="text-white">${Math.floor(calculateTotalPrice() * 0.12).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="border-t border-white/20 pt-3">
                      <div className="flex justify-between text-lg font-bold text-white">
                        <span>Total</span>
                        <span>${Math.floor(calculateTotalPrice() * 1.12).toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-3">Need Help?</h3>
              <p className="text-blue-200 text-sm mb-4">
                Our travel experts are available 24/7 to assist you.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-blue-200">
                  📞 <span className="text-white">1-800-VACATION</span>
                </p>
                <p className="text-blue-200">
                  ✉️ <span className="text-white">support@wheretovacation.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Search */}
        <div className="text-center mt-12">
          <Link
            href="/search"
            className="inline-block px-8 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
          >
            ← Back to Search
          </Link>
        </div>
      </div>
    </div>
  );
}
