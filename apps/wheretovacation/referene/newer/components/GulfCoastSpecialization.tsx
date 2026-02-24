'use client';

import React from 'react';
import Link from 'next/link';
import { Waves, Anchor, MapPin, Calendar, Star, Users, DollarSign, Sun, Fish, Palmtree } from 'lucide-react';

interface GulfDestination {
  id: string;
  name: string;
  state: string;
  description: string;
  highlights: string[];
  bestTime: string;
  avgTemp: string;
  avgCost: string;
  rating: number;
  image: string;
  activities: string[];
}

const gulfDestinations: GulfDestination[] = [
  {
    id: 'orange-beach-al',
    name: 'Orange Beach',
    state: 'Alabama',
    description: 'Sugar-white sand beaches and family-friendly attractions make this Alabama gem a Gulf Coast favorite.',
    highlights: ['32 miles of pristine beaches', 'Family attractions', 'Fresh seafood', 'Gulf State Park'],
    bestTime: 'March - May, September - November',
    avgTemp: '68-85°F',
    avgCost: '$150-300/night',
    rating: 4.8,
    image: '/orange-beach-al.webp',
    activities: ['Beach', 'Fishing', 'Family Fun', 'Dining']
  },
  {
    id: 'gulf-shores-al',
    name: 'Gulf Shores',
    state: 'Alabama',
    description: 'Experience the perfect blend of relaxation and adventure on Alabama\'s beautiful Gulf Coast.',
    highlights: ['Gulf Shores Parkway', 'The Wharf', 'Zoo', 'Water parks'],
    bestTime: 'April - May, September - October',
    avgTemp: '67-88°F',
    avgCost: '$140-280/night',
    rating: 4.7,
    image: '/gulf-shores-al.webp',
    activities: ['Beach', 'Entertainment', 'Family', 'Shopping']
  },
  {
    id: 'destin-fl',
    name: 'Destin',
    state: 'Florida',
    description: 'Known as "The World\'s Luckiest Fishing Village," Destin offers emerald waters and world-class fishing.',
    highlights: ['Emerald waters', 'Fishing charters', 'HarborWalk Village', 'Gulf Islands National Seashore'],
    bestTime: 'April - May, September - October',
    avgTemp: '70-89°F',
    avgCost: '$200-400/night',
    rating: 4.9,
    image: '/destin-fl.webp',
    activities: ['Fishing', 'Beach', 'Dining', 'Water Sports']
  },
  {
    id: 'panama-city-beach-fl',
    name: 'Panama City Beach',
    state: 'Florida',
    description: '27 miles of spectacular white sand beaches and endless entertainment options.',
    highlights: ['27-mile beach', 'Shell Island', 'St. Andrews State Park', 'Pier Park'],
    bestTime: 'April - May, September - October',
    avgTemp: '68-87°F',
    avgCost: '$120-250/night',
    rating: 4.6,
    image: '/panama-city-beach-fl.webp',
    activities: ['Beach', 'Family', 'Nightlife', 'Water Sports']
  },
  {
    id: 'galveston-tx',
    name: 'Galveston',
    state: 'Texas',
    description: 'Historic charm meets beach fun in this iconic Texas Gulf Coast destination.',
    highlights: ['Historic Strand', 'Pleasure Pier', 'Moody Gardens', 'Beach parks'],
    bestTime: 'March - May, October - November',
    avgTemp: '65-85°F',
    avgCost: '$100-200/night',
    rating: 4.5,
    image: '/galveston-tx.webp',
    activities: ['History', 'Beach', 'Family', 'Dining']
  },
  {
    id: 'south-padre-tx',
    name: 'South Padre Island',
    state: 'Texas',
    description: 'Texas\'s tropical paradise with pristine beaches and world-class windsurfing.',
    highlights: ['Laguna Madre', 'Sea Turtle Inc', 'Dolphin watching', 'Sandcastle lessons'],
    bestTime: 'March - May, September - November',
    avgTemp: '70-88°F',
    avgCost: '$130-260/night',
    rating: 4.7,
    image: '/south-padre-tx.webp',
    activities: ['Beach', 'Water Sports', 'Wildlife', 'Romance']
  }
];

const seasonalGuide = [
  {
    season: 'Spring (March - May)',
    description: 'Perfect weather with mild temperatures and fewer crowds. Ideal for beach activities and fishing.',
    highlights: ['Spring Break events', 'Blooming flowers', 'Perfect beach weather', 'Great fishing'],
    avgTemp: '65-80°F'
  },
  {
    season: 'Summer (June - August)',
    description: 'Peak season with warm waters and vibrant nightlife. Great for families and water activities.',
    highlights: ['Warmest waters', 'Live music', 'Family attractions', 'Water sports'],
    avgTemp: '80-90°F'
  },
  {
    season: 'Fall (September - November)',
    description: 'Beautiful weather with comfortable temperatures and excellent fishing conditions.',
    highlights: ['Fall festivals', 'Less crowded', 'Great fishing', 'Comfortable swimming'],
    avgTemp: '70-85°F'
  },
  {
    season: 'Winter (December - February)',
    description: 'Mild temperatures and peaceful beaches. Perfect for quiet getaways and bird watching.',
    highlights: ['Peaceful beaches', 'Bird watching', 'Lower prices', 'Mild weather'],
    avgTemp: '55-70°F'
  }
];

export default function GulfCoastSpecialization() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl p-8 mb-8">
        <div className="text-center">
          <div className="flex justify-center gap-4 mb-4">
            <Waves className="w-12 h-12" />
            <Palmtree className="w-12 h-12" />
            <Anchor className="w-12 h-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Gulf Coast Vacation Guide
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-6">
            Your complete guide to the Gulf Coast\'s most beautiful destinations. 
            From Alabama\'s sugar-white sands to Texas\' tropical paradise.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>6 States</span>
            </div>
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2">
              <Sun className="w-4 h-4" />
              <span>Year-Round Sunshine</span>
            </div>
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2">
              <Fish className="w-4 h-4" />
              <span>World-Class Fishing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Destinations */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Featured Gulf Coast Destinations</h2>
          <Link
            href="/search?region=gulf-coast"
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            View All →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gulfDestinations.map((destination) => (
            <Link
              key={destination.id}
              href={`/destination/${destination.id}`}
              className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
            >
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Waves className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-sm">Beach View</p>
                  </div>
                </div>
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                  {destination.state}
                </div>
                <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" />
                  {destination.rating}
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {destination.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{destination.description}</p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Best: {destination.bestTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Sun className="w-4 h-4" />
                    <span>{destination.avgTemp}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>{destination.avgCost}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {destination.activities.slice(0, 3).map((activity, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {activity}
                    </span>
                  ))}
                </div>

                <div className="text-sm text-gray-500">
                  Highlights: {destination.highlights.slice(0, 2).join(', ')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Seasonal Guide */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">When to Visit the Gulf Coast</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {seasonalGuide.map((season, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-800">{season.season}</h3>
              </div>
              <p className="text-gray-600 mb-4">{season.description}</p>
              <div className="space-y-2 mb-4">
                {season.highlights.map((highlight, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-800">Average Temperature</div>
                <div className="text-lg font-bold text-blue-600">{season.avgTemp}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gulf Coast Experiences */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Gulf Coast Experiences</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <Fish className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">World-Class Fishing</h3>
            <p className="text-gray-600 mb-4">
              From deep-sea charters to bay fishing, the Gulf Coast offers some of the best fishing opportunities in the world.
            </p>
            <Link href="/search?activity=fishing" className="text-blue-600 hover:text-blue-800 font-medium">
              Explore Fishing →
            </Link>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
            <Sun className="w-12 h-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Beach Paradise</h3>
            <p className="text-gray-600 mb-4">
              Miles of sugar-white sand beaches and emerald waters perfect for swimming, sunbathing, and water sports.
            </p>
            <Link href="/search?activity=beach" className="text-orange-600 hover:text-orange-800 font-medium">
              Find Beaches →
            </Link>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
            <Users className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Family Fun</h3>
            <p className="text-gray-600 mb-4">
              Family-friendly attractions, water parks, and activities that create lasting memories for all ages.
            </p>
            <Link href="/search?travel-style=family" className="text-green-600 hover:text-green-800 font-medium">
              Family Activities →
            </Link>
          </div>
        </div>
      </section>

      {/* Planning Resources */}
      <section className="bg-gray-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Plan Your Gulf Coast Vacation</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Choose Your Destination</h3>
            <p className="text-gray-600 mb-4">
              Browse our curated selection of Gulf Coast destinations.
            </p>
            <Link href="/search?region=gulf-coast" className="text-blue-600 hover:text-blue-800 font-medium">
              Browse Destinations →
            </Link>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Pick Your Dates</h3>
            <p className="text-gray-600 mb-4">
              Use our seasonal guide to find the perfect time for your trip.
            </p>
            <Link href="/seasonal-guide" className="text-green-600 hover:text-green-800 font-medium">
              View Seasonal Guide →
            </Link>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Anchor className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Book Your Adventure</h3>
            <p className="text-gray-600 mb-4">
              Find accommodations, activities, and charters for your perfect vacation.
            </p>
            <Link href="/search" className="text-purple-600 hover:text-purple-800 font-medium">
              Start Planning →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
