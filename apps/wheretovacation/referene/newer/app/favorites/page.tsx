"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState('favorites');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            My Favorites & Trip Plans
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Save your favorite properties, create wishlists, and plan your perfect activity-based vacation.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-1">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'favorites'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              ❤️ Favorites
            </button>
            <button
              onClick={() => setActiveTab('wishlists')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'wishlists'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              📋 Wishlists
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'trips'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              ✈️ Trip Plans
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-2xl font-bold text-white mb-4">No Favorites Yet</h2>
            <p className="text-blue-200 mb-8">
              Start exploring and save your favorite vacation properties!
            </p>
            <Link
              href="/search"
              className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
            >
              Explore Properties
            </Link>
          </div>
        </div>

        {/* Back to Search */}
        <div className="text-center mt-12">
          <Link
            href="/search"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            ← Back to Search
          </Link>
        </div>
      </div>
    </div>
  );
}
