"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState('upcoming');
  
  const bookings = [
    {
      id: 1,
      activity: '🏄 Surfing',
      title: 'Costa Rica Surf Camp',
      location: 'Santa Teresa, Costa Rica',
      date: 'Dec 28, 2024 - Jan 4, 2025',
      status: 'confirmed',
      price: '$1,299'
    },
    {
      id: 2,
      activity: '🏔️ Hiking',
      title: 'Yosemite Adventure Package',
      location: 'Yosemite National Park, CA',
      date: 'Feb 15-18, 2025',
      status: 'pending',
      price: '$899'
    },
    {
      id: 3,
      activity: '🎿 Skiing',
      title: 'Aspen Ski Week',
      location: 'Aspen, Colorado',
      date: 'Jan 20-25, 2025',
      status: 'confirmed',
      price: '$2,499'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            My Activity Bookings
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Manage your vacation activity bookings and upcoming adventures.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-1">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'past'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Past Trips
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'wishlist'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Wishlist
            </button>
          </div>
        </div>

        {/* Bookings Content */}
        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{booking.activity}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{booking.title}</h3>
                      <p className="text-blue-200">{booking.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{booking.price}</div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-blue-200">
                    📅 {booking.date}
                  </div>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors">
                      View Details
                    </button>
                    <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md transition-colors">
                      Modify Booking
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'past' && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">🏝️</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Past Adventures Yet</h3>
            <p className="text-blue-200 mb-6">Your completed activity bookings will appear here</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
            >
              Find New Activities
            </Link>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Activity Wishlist</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🎣</span>
                  <div>
                    <h4 className="text-white font-medium">Deep Sea Fishing - Alaska</h4>
                    <p className="text-blue-300 text-sm">Halibut and salmon fishing expedition</p>
                  </div>
                </div>
                <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-md transition-colors">
                  Book Now
                </button>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🏛️</span>
                  <div>
                    <h4 className="text-white font-medium">Cultural Tour - Japan</h4>
                    <p className="text-blue-300 text-sm">Temples, traditions, and tea ceremonies</p>
                  </div>
                </div>
                <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-md transition-colors">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            ← Back to Activity Search
          </Link>
        </div>
      </div>
    </div>
  );
}
