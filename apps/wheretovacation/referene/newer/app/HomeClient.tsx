"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePreferences } from '@/lib/preferences';

export default function HomeClient() {
  const [mounted, setMounted] = useState(false);
  const { preferences, getInsights } = usePreferences();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activities = [
    {
      icon: "🏄",
      title: "Surfing & Watersports",
      description: "Find the best surfing spots and watersport activities worldwide",
      color: "from-blue-500 to-cyan-600",
      tags: ["Surfing", "Kayaking", "Paddleboarding", "Snorkeling"]
    },
    {
      icon: "🎣",
      title: "Fishing Adventures",
      description: "Discover fishing charters and spots for every skill level",
      color: "from-green-500 to-emerald-600",
      tags: ["Deep Sea", "Fly Fishing", "Lake Fishing", "Charters"]
    },
    {
      icon: "🏔️",
      title: "Mountain & Hiking",
      description: "Explore hiking trails and mountain adventures globally",
      color: "from-purple-500 to-pink-600",
      tags: ["Hiking", "Climbing", "Camping", "Wildlife"]
    },
    {
      icon: "🏖️",
      title: "Beach & Relaxation",
      description: "Perfect beach destinations for relaxation and fun",
      color: "from-yellow-500 to-orange-600",
      tags: ["Beaches", "Resorts", "Islands", "Spa"]
    },
    {
      icon: "🎿",
      title: "Winter Sports",
      description: "Skiing, snowboarding, and winter adventure destinations",
      color: "from-indigo-500 to-blue-600",
      tags: ["Skiing", "Snowboarding", "Ice Climbing", "Resorts"]
    },
    {
      icon: "🏛️",
      title: "Cultural & Heritage",
      description: "Immerse yourself in local culture and historical sites",
      color: "from-red-500 to-pink-600",
      tags: ["Museums", "Historical Sites", "Local Tours", "Events"]
    }
  ];

  const insights = mounted ? getInsights() : null;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            WhereToVacation
          </h1>
          <p className="text-xl md:text-2xl text-blue-200 max-w-4xl mx-auto mb-8">
            Find your perfect vacation by choosing what you love to do, not where you want to go.
            <br />
            <span className="text-lg text-cyan-300">
              Personalized recommendations based on your travel style and preferences.
            </span>
          </p>
          
          {/* Personalization Banner */}
          {preferences.enablePersonalization && insights && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 max-w-2xl mx-auto mb-8">
              <p className="text-cyan-300 text-sm">
                Welcome back! Based on your {insights.travelStylePreference} style and {insights.budgetPreference} budget,
                we've personalized your recommendations.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105"
            >
              Start Your Search
            </Link>
            <Link
              href="/compare"
              className="px-8 py-4 bg-white/20 backdrop-blur text-white font-bold text-lg rounded-xl hover:bg-white/30 transition-all transform hover:scale-105"
            >
              Compare Destinations
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose WhereToVacation?
            </h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              We're different because we focus on what matters most: your perfect experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-3">Decision-First</h3>
              <p className="text-blue-200">
                Don't know where to go? We help you decide based on your activities, budget, and travel style.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-white mb-3">Seasonal Intelligence</h3>
              <p className="text-blue-200">
                Find the best time to visit with weather patterns, crowd levels, and seasonal pricing insights.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">⚖️</div>
              <h3 className="text-xl font-bold text-white mb-3">Smart Comparison</h3>
              <p className="text-blue-200">
                Compare destinations side-by-side with detailed metrics and shareable comparison links.
              </p>
            </div>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What's Your Adventure?
            </h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              Choose your favorite activity and we'll show you the best destinations worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activities.map((activity, index) => (
              <Link
                key={index}
                href={`/search?activity=${activity.title.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                className={`group bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all transform hover:scale-105 hover:border-cyan-400/50`}
              >
                <div className={`text-5xl mb-4 bg-gradient-to-r ${activity.color} bg-clip-text text-transparent`}>
                  {activity.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                  {activity.title}
                </h3>
                <p className="text-blue-200 mb-4">
                  {activity.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {activity.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-3 py-1 bg-white/10 text-cyan-300 rounded-full text-xs border border-cyan-400/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {insights && (insights.mostSearched.length > 0 || insights.recentlyViewed.length > 0) && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Your Recent Activity</h2>
              <p className="text-blue-200 text-sm">
                Pick up where you left off with your recent searches and views.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {insights.mostSearched.length > 0 && (
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Recently Searched</h3>
                  <div className="space-y-2">
                    {insights.mostSearched.slice(0, 3).map((destination, index) => (
                      <Link
                        key={index}
                        href={`/destination/${destination}`}
                        className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="text-white capitalize">{destination}</div>
                        <div className="text-blue-300 text-sm">View details →</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {insights.recentlyViewed.length > 0 && (
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Recently Viewed</h3>
                  <div className="space-y-2">
                    {insights.recentlyViewed.slice(0, 3).map((destination, index) => (
                      <Link
                        key={index}
                        href={`/destination/${destination}`}
                        className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="text-white capitalize">{destination}</div>
                        <div className="text-blue-300 text-sm">View details →</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-12 border border-cyan-400/30">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready for Your Perfect Vacation?
            </h2>
            <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
              Join thousands of travelers who found their dream destinations through our personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/search"
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105"
              >
                Start Searching Now
              </Link>
              <Link
                href="/compare"
                className="px-8 py-4 bg-white/20 backdrop-blur text-white font-bold text-lg rounded-xl hover:bg-white/30 transition-all transform hover:scale-105"
              >
                Compare Destinations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
