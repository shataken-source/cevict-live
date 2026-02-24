"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function ActivitiesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Activities', icon: '🎯' },
    { id: 'watersports', name: 'Watersports', icon: '🏄' },
    { id: 'mountain', name: 'Mountain', icon: '🏔️' },
    { id: 'winter', name: 'Winter', icon: '🎿' },
    { id: 'beach', name: 'Beach', icon: '🏖️' },
    { id: 'cultural', name: 'Cultural', icon: '🏛️' }
  ];

  const activities = [
    {
      id: 'surfing',
      name: 'Surfing',
      category: 'watersports',
      icon: '🏄',
      description: 'Ride the waves at world-class surf breaks',
      destinations: ['Costa Rica', 'Hawaii', 'California', 'Australia'],
      difficulty: 'Intermediate',
      duration: 'Half-day to Multi-day',
      price: '$100-500'
    },
    {
      id: 'kayaking',
      name: 'Sea Kayaking',
      category: 'watersports',
      icon: '🛶',
      description: 'Explore coastal waters and hidden coves',
      destinations: ['Norway Fjords', 'New Zealand', 'Alaska', 'Greece'],
      difficulty: 'Beginner to Advanced',
      duration: 'Half-day to Full-day',
      price: '$80-300'
    },
    {
      id: 'diving',
      name: 'Scuba Diving',
      category: 'watersports',
      icon: '🤿',
      description: 'Discover underwater worlds and marine life',
      destinations: ['Great Barrier Reef', 'Maldives', 'Caribbean', 'Red Sea'],
      difficulty: 'Certified Divers',
      duration: 'Full-day to Multi-day',
      price: '$150-800'
    },
    {
      id: 'hiking',
      name: 'Mountain Hiking',
      category: 'mountain',
      icon: '🥾',
      description: 'Trek scenic trails and reach stunning summits',
      destinations: ['Yosemite', 'Swiss Alps', 'Patagonia', 'Himalayas'],
      difficulty: 'Beginner to Expert',
      duration: 'Day hikes to Multi-week',
      price: '$50-500'
    },
    {
      id: 'climbing',
      name: 'Rock Climbing',
      category: 'mountain',
      icon: '🧗',
      description: 'Challenge yourself on vertical rock faces',
      destinations: ['Yosemite', 'Dolomites', 'Joshua Tree', 'Thailand'],
      difficulty: 'Intermediate to Expert',
      duration: 'Half-day to Multi-day',
      price: '$200-800'
    },
    {
      id: 'camping',
      name: 'Wilderness Camping',
      category: 'mountain',
      icon: '⛺',
      description: 'Sleep under the stars in pristine nature',
      destinations: ['National Parks', 'Scandinavia', 'Canada', 'New Zealand'],
      difficulty: 'Beginner to Advanced',
      duration: 'Weekend to Multi-week',
      price: '$30-200'
    },
    {
      id: 'skiing',
      name: 'Downhill Skiing',
      category: 'winter',
      icon: '🎿',
      description: 'Carve through pristine powder on world-class slopes',
      destinations: ['Aspen', 'Swiss Alps', 'Japanese Alps', 'Whistler'],
      difficulty: 'Beginner to Expert',
      duration: 'Full-day to Multi-week',
      price: '$150-1000'
    },
    {
      id: 'snowboarding',
      name: 'Snowboarding',
      category: 'winter',
      icon: '🏂',
      description: 'Master terrain parks and backcountry powder',
      destinations: ['Colorado', 'British Columbia', 'France', 'Japan'],
      difficulty: 'Intermediate to Expert',
      duration: 'Full-day to Multi-week',
      price: '$150-1000'
    },
    {
      id: 'ice-climbing',
      name: 'Ice Climbing',
      category: 'winter',
      icon: '🧊',
      description: 'Scale frozen waterfalls and ice walls',
      destinations: ['Norway', 'Colorado', 'Iceland', 'Canada'],
      difficulty: 'Expert',
      duration: 'Full-day to Multi-day',
      price: '$300-1000'
    },
    {
      id: 'beach',
      name: 'Beach Relaxation',
      category: 'beach',
      icon: '🏖️',
      description: 'Unwind on pristine sandy shores',
      destinations: ['Caribbean', 'Maldives', 'Seychelles', 'Greek Islands'],
      difficulty: 'All Levels',
      duration: 'Day trips to Multi-week',
      price: '$50-500'
    },
    {
      id: 'snorkeling',
      name: 'Snorkeling',
      category: 'beach',
      icon: '🐠',
      description: 'Explore vibrant coral reefs and tropical fish',
      destinations: ['Great Barrier Reef', 'Caribbean', 'Red Sea', 'Hawaii'],
      difficulty: 'Beginner',
      duration: 'Half-day to Full-day',
      price: '$50-150'
    },
    {
      id: 'island-hopping',
      name: 'Island Hopping',
      category: 'beach',
      icon: '🏝️',
      description: 'Discover multiple tropical paradises',
      destinations: ['Greek Islands', 'Thailand', 'Philippines', 'Croatia'],
      difficulty: 'All Levels',
      duration: 'Multi-day to Multi-week',
      price: '$200-2000'
    },
    {
      id: 'museums',
      name: 'Museum Tours',
      category: 'cultural',
      icon: '🏛️',
      description: 'Explore world-class art and history collections',
      destinations: ['Paris', 'Rome', 'New York', 'London'],
      difficulty: 'All Levels',
      duration: 'Half-day to Full-day',
      price: '$20-100'
    },
    {
      id: 'historical',
      name: 'Historical Sites',
      category: 'cultural',
      icon: '🏺',
      description: 'Walk through ancient civilizations and heritage',
      destinations: ['Rome', 'Egypt', 'Greece', 'Peru'],
      difficulty: 'All Levels',
      duration: 'Full-day to Multi-day',
      price: '$50-300'
    },
    {
      id: 'local-culture',
      name: 'Local Cultural Experiences',
      category: 'cultural',
      icon: '🎭',
      description: 'Immerse in authentic local traditions and festivals',
      destinations: ['Japan', 'India', 'Morocco', 'Mexico'],
      difficulty: 'All Levels',
      duration: 'Full-day to Multi-week',
      price: '$100-800'
    }
  ];

  const filteredActivities = selectedCategory === 'all' 
    ? activities 
    : activities.filter(activity => activity.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Browse All Activities
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Discover your next adventure by exploring our comprehensive collection of vacation activities.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-white text-blue-900'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Activities Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredActivities.map((activity) => (
            <div key={activity.id} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4 text-center">{activity.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2 text-center">{activity.name}</h3>
              <p className="text-blue-200 mb-4 text-center">{activity.description}</p>
              
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-300">Difficulty:</span>
                  <span className="text-white">{activity.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Duration:</span>
                  <span className="text-white">{activity.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Price Range:</span>
                  <span className="text-white">{activity.price}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-blue-300 text-sm mb-2">Popular Destinations:</div>
                <div className="flex flex-wrap gap-1">
                  {activity.destinations.slice(0, 3).map((dest, index) => (
                    <span key={index} className="px-2 py-1 bg-white/10 text-cyan-300 text-xs rounded-full">
                      {dest}
                    </span>
                  ))}
                  {activity.destinations.length > 3 && (
                    <span className="px-2 py-1 bg-white/10 text-cyan-300 text-xs rounded-full">
                      +{activity.destinations.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={`/search?activity=${activity.id}`}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-md transition-colors text-center block"
              >
                Explore {activity.name}
              </Link>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/search"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            🎯 Start Custom Search
          </Link>
          <div className="mt-4">
            <Link
              href="/"
              className="text-blue-300 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
