'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, DollarSign, MapPin, Phone, Mail } from 'lucide-react';

interface CharterOption {
  id: string;
  name: string;
  duration: string;
  price: number;
  maxGuests: number;
  description: string;
  includes: string[];
}

interface BookingFormData {
  charterId: string;
  date: string;
  time: string;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
}

const charterOptions: CharterOption[] = [
  {
    id: 'half-day-inshore',
    name: 'Half Day Inshore Fishing',
    duration: '4 hours',
    price: 600,
    maxGuests: 4,
    description: 'Perfect for families and beginners. Fish the calm waters of the back bays and inlets.',
    includes: ['Bait', 'Tackle', 'Ice', 'Fishing License', 'Fuel']
  },
  {
    id: 'full-day-inshore',
    name: 'Full Day Inshore Fishing',
    duration: '8 hours',
    price: 900,
    maxGuests: 4,
    description: 'Extended time to explore multiple fishing spots and target different species.',
    includes: ['Bait', 'Tackle', 'Ice', 'Fishing License', 'Fuel', 'Lunch']
  },
  {
    id: 'half-day-offshore',
    name: 'Half Day Offshore Fishing',
    duration: '6 hours',
    price: 1200,
    maxGuests: 6,
    description: 'Venture into the Gulf for bigger fish and deeper waters.',
    includes: ['Bait', 'Tackle', 'Ice', 'Fishing License', 'Fuel', 'Offshore Gear']
  },
  {
    id: 'full-day-offshore',
    name: 'Full Day Offshore Fishing',
    duration: '10 hours',
    price: 1800,
    maxGuests: 6,
    description: 'Ultimate Gulf Coast experience targeting trophy fish.',
    includes: ['Bait', 'Tackle', 'Ice', 'Fishing License', 'Fuel', 'Offshore Gear', 'Meals']
  }
];

const timeSlots = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', 
  '12:00 PM', '1:00 PM', '2:00 PM'
];

export default function BookingEngine() {
  const [selectedCharter, setSelectedCharter] = useState<CharterOption | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [formData, setFormData] = useState<BookingFormData>({
    charterId: '',
    date: '',
    time: '',
    guests: 1,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Generate available dates (next 30 days, excluding past dates and booked dates)
  useEffect(() => {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays (captain's day off)
      if (date.getDay() !== 0) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    
    setAvailableDates(dates);
  }, []);

  const handleCharterSelect = (charter: CharterOption) => {
    setSelectedCharter(charter);
    setFormData(prev => ({ ...prev, charterId: charter.id }));
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setFormData(prev => ({ ...prev, date }));
    setStep(3);
  };

  const handleTimeSelect = (time: string) => {
    setFormData(prev => ({ ...prev, time }));
    setStep(4);
  };

  const handleGuestsChange = (guests: number) => {
    setFormData(prev => ({ ...prev, guests }));
  };

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    return !!(
      formData.charterId &&
      formData.date &&
      formData.time &&
      formData.guests > 0 &&
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.phone.trim()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call to booking system
      // In production, this would integrate with FareHarbor, AnyCreek, or similar
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setBookingConfirmed(true);
        setStep(5);
      } else {
        throw new Error('Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('There was an error processing your booking. Please call us directly.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetBooking = () => {
    setFormData({
      charterId: '',
      date: '',
      time: '',
      guests: 1,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialRequests: ''
    });
    setSelectedCharter(null);
    setStep(1);
    setBookingConfirmed(false);
  };

  if (bookingConfirmed) {
    return (
      <div className="max-w-2xl mx-auto bg-green-50 border border-green-200 rounded-xl p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🎣</div>
          <h2 className="text-2xl font-bold text-green-800 mb-4">Booking Confirmed!</h2>
          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Booking Details</h3>
            <div className="space-y-2 text-left text-gray-600">
              <p><strong>Charter:</strong> {selectedCharter?.name}</p>
              <p><strong>Date:</strong> {new Date(formData.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {formData.time}</p>
              <p><strong>Guests:</strong> {formData.guests}</p>
              <p><strong>Total:</strong> ${selectedCharter?.price}</p>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            A confirmation email has been sent to {formData.email}. 
            Please arrive 15 minutes early at our pickup location.
          </p>
          <button
            onClick={resetBooking}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Book Another Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Book Your Charter</h2>
          <span className="text-sm">Step {step} of 4</span>
        </div>
        <div className="w-full bg-blue-800 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Select Charter */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Choose Your Fishing Adventure</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {charterOptions.map((charter) => (
                <div
                  key={charter.id}
                  onClick={() => handleCharterSelect(charter)}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{charter.name}</h4>
                    <span className="text-lg font-bold text-blue-600">${charter.price}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{charter.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {charter.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Max {charter.maxGuests} guests
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Date */}
        {step === 2 && selectedCharter && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              ← Back to charters
            </button>
            <h3 className="text-lg font-semibold mb-4">Select Your Date</h3>
            <p className="text-gray-600 mb-4">
              Available dates for {selectedCharter.name} (Sundays unavailable)
            </p>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
                >
                  <div className="text-sm font-medium">
                    {new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(date).toLocaleDateString('en', { weekday: 'short' })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Time & Guests */}
        {step === 3 && selectedCharter && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              ← Back to dates
            </button>
            <h3 className="text-lg font-semibold mb-4">Select Time & Number of Guests</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departure Time
              </label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className="p-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Guests (Max: {selectedCharter.maxGuests})
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max={selectedCharter.maxGuests}
                  value={formData.guests}
                  onChange={(e) => handleGuestsChange(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="font-semibold text-lg w-12 text-center">{formData.guests}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Customer Information */}
        {step === 4 && selectedCharter && (
          <div>
            <button
              onClick={() => setStep(3)}
              className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              ← Back to time
            </button>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Your Information</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Requests
                    </label>
                    <textarea
                      value={formData.specialRequests}
                      onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any special requirements or requests..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Processing...' : `Complete Booking - $${selectedCharter.price}`}
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-gray-600">Charter:</span>
                    <span className="font-semibold ml-2">{selectedCharter.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold ml-2">
                      {new Date(formData.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <span className="font-semibold ml-2">{formData.time}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Guests:</span>
                    <span className="font-semibold ml-2">{formData.guests}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-xl font-bold text-blue-600">${selectedCharter.price}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">What's Included:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {selectedCharter.includes.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">What to Bring:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Sunscreen</li>
                    <li>• Hat & Sunglasses</li>
                    <li>• Camera</li>
                    <li>• Food & Drinks (optional)</li>
                    <li>• Seasickness medication (if needed)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
