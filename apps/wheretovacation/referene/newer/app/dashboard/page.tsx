"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState('properties');
  
  // Mock data for demonstration
  const properties = [
    {
      id: 1,
      name: 'Sunset Beach Villa',
      type: 'Beach House',
      location: 'Miami Beach, Florida',
      status: 'published',
      views: 1247,
      inquiries: 23,
      bookings: 8,
      revenue: '$12,400',
      rating: 4.8
    },
    {
      id: 2,
      name: 'Mountain Retreat Cabin',
      type: 'Mountain Cabin',
      location: 'Aspen, Colorado',
      status: 'draft',
      views: 0,
      inquiries: 0,
      bookings: 0,
      revenue: '$0',
      rating: 0
    }
  ];

  const inquiries = [
    {
      id: 1,
      property: 'Sunset Beach Villa',
      guestName: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      dates: 'Dec 28 - Jan 4',
      guests: 4,
      message: 'Is the property available for surfing activities nearby?',
      status: 'new',
      date: '2024-12-19'
    },
    {
      id: 2,
      property: 'Sunset Beach Villa',
      guestName: 'Mike Chen',
      email: 'mike.chen@email.com',
      dates: 'Jan 15-18',
      guests: 2,
      message: 'Do you have any fishing gear available for guests?',
      status: 'replied',
      date: '2024-12-18'
    }
  ];

  const bookings = [
    {
      id: 1,
      property: 'Sunset Beach Villa',
      guestName: 'Emily Davis',
      dates: 'Dec 20-25',
      guests: 6,
      total: '$2,500',
      status: 'confirmed',
      checkIn: '2024-12-20'
    },
    {
      id: 2,
      property: 'Sunset Beach Villa',
      guestName: 'Robert Wilson',
      dates: 'Jan 5-10',
      guests: 4,
      total: '$2,000',
      status: 'pending',
      checkIn: '2025-01-05'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Property Owner Dashboard
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Manage your vacation rental properties and connect with activity-seeking travelers.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-1">
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'properties'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              🏠 My Properties
            </button>
            <button
              onClick={() => setActiveTab('inquiries')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'inquiries'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              💬 Inquiries
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'bookings'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              📅 Bookings
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              📊 Analytics
            </button>
          </div>
        </div>

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Your Properties</h2>
              <Link
                href="/list"
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
              >
                + Add New Property
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {properties.map((property) => (
                <div key={property.id} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{property.name}</h3>
                      <p className="text-blue-200">{property.type} • {property.location}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      property.status === 'published' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {property.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-blue-300">Views</div>
                      <div className="text-white font-medium">{property.views.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-blue-300">Inquiries</div>
                      <div className="text-white font-medium">{property.inquiries}</div>
                    </div>
                    <div>
                      <div className="text-blue-300">Bookings</div>
                      <div className="text-white font-medium">{property.bookings}</div>
                    </div>
                    <div>
                      <div className="text-blue-300">Revenue</div>
                      <div className="text-white font-medium">{property.revenue}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors">
                      Edit
                    </button>
                    <button className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inquiries Tab */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Guest Inquiries</h2>
            
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <div key={inquiry.id} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Re: {inquiry.property}</h3>
                      <p className="text-blue-200">From: {inquiry.guestName} ({inquiry.email})</p>
                      <p className="text-blue-300 text-sm">Dates: {inquiry.dates} • {inquiry.guests} guests</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        inquiry.status === 'new' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {inquiry.status === 'new' ? 'New' : 'Replied'}
                      </span>
                      <p className="text-blue-300 text-sm mt-1">{inquiry.date}</p>
                    </div>
                  </div>
                  
                  <p className="text-blue-200 mb-4">"{inquiry.message}"</p>
                  
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md transition-colors">
                      Reply
                    </button>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors">
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Upcoming Bookings</h2>
            
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{booking.property}</h3>
                      <p className="text-blue-200">Guest: {booking.guestName}</p>
                      <p className="text-blue-300 text-sm">Dates: {booking.dates} • {booking.guests} guests</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{booking.total}</div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md transition-colors">
                      Contact Guest
                    </button>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors">
                      View Details
                    </button>
                    {booking.status === 'pending' && (
                      <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors">
                        Confirm Booking
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 text-center">
                <div className="text-3xl mb-2">👁️</div>
                <div className="text-3xl font-bold text-white">1,247</div>
                <div className="text-blue-300">Total Views</div>
                <div className="text-green-400 text-sm mt-2">+12% this month</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 text-center">
                <div className="text-3xl mb-2">💬</div>
                <div className="text-3xl font-bold text-white">23</div>
                <div className="text-blue-300">Inquiries</div>
                <div className="text-green-400 text-sm mt-2">+8% this month</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 text-center">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-3xl font-bold text-white">8</div>
                <div className="text-blue-300">Bookings</div>
                <div className="text-green-400 text-sm mt-2">+25% this month</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 text-center">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-3xl font-bold text-white">$12.4k</div>
                <div className="text-blue-300">Revenue</div>
                <div className="text-green-400 text-sm mt-2">+18% this month</div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-6">Popular Activities Near Your Properties</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-cyan-400 font-medium mb-3">Sunset Beach Villa</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-blue-200">
                      <span>🏄 Surfing & Watersports</span>
                      <span>45 inquiries</span>
                    </div>
                    <div className="flex justify-between text-blue-200">
                      <span>🎣 Fishing Adventures</span>
                      <span>23 inquiries</span>
                    </div>
                    <div className="flex justify-between text-blue-200">
                      <span>🏖️ Beach & Relaxation</span>
                      <span>18 inquiries</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-cyan-400 font-medium mb-3">Mountain Retreat Cabin</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-blue-200">
                      <span>🏔️ Mountain & Hiking</span>
                      <span>0 inquiries</span>
                    </div>
                    <div className="flex justify-between text-blue-200">
                      <span>🎿 Winter Sports</span>
                      <span>0 inquiries</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
