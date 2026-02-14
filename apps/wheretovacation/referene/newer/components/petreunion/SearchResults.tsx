'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, Filter } from 'lucide-react';

interface PetResult {
  id: string;
  name: string;
  type: string;
  emoji: string;
  status: 'Lost' | 'Found';
  details: string;
  location: string;
  timeAgo: string;
  gradient: string;
}

export default function SearchResults() {
  const [searchLocation, setSearchLocation] = useState('Birmingham, AL');
  const [petType, setPetType] = useState('All Pets');
  const [status, setStatus] = useState('Lost & Found');
  const [sortBy, setSortBy] = useState('Most Recent');

  // Filter states
  const [filters, setFilters] = useState({
    lostPets: true,
    foundPets: true,
    dogs: true,
    cats: true,
    other: false,
    small: false,
    medium: false,
    large: false,
    timePeriod: '7days'
  });

  const petResults: PetResult[] = [
    {
      id: '1',
      name: 'Max',
      type: 'Golden Retriever • Male • 3 years',
      emoji: '🐕',
      status: 'Lost',
      details: 'Friendly, wearing blue collar',
      location: 'Mountain Brook, AL',
      timeAgo: 'Lost 2 days ago',
      gradient: 'from-blue-400 to-blue-600'
    },
    {
      id: '2',
      name: 'Luna',
      type: 'Tabby Cat • Female • Unknown age',
      emoji: '🐈',
      status: 'Found',
      details: 'No collar, friendly',
      location: 'Homewood, AL',
      timeAgo: 'Found 1 day ago',
      gradient: 'from-orange-400 to-orange-600'
    },
    {
      id: '3',
      name: 'Buddy',
      type: 'Lab Mix • Male • 5 years',
      emoji: '🐕',
      status: 'Lost',
      details: 'Microchipped, very friendly',
      location: 'Hoover, AL',
      timeAgo: 'Lost 4 days ago',
      gradient: 'from-green-400 to-green-600'
    },
    {
      id: '4',
      name: 'Whiskers',
      type: 'Siamese Cat • Male • 2 years',
      emoji: '🐈',
      status: 'Found',
      details: 'White paws, vocal',
      location: 'Vestavia Hills, AL',
      timeAgo: 'Found 3 days ago',
      gradient: 'from-pink-400 to-pink-600'
    }
  ];

  const handleFilterChange = (filterName: string, value: boolean | string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleSearch = () => {
    // Implement search logic here
    console.log('Searching with:', { searchLocation, petType, status, filters });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-orange-500">
            <span>🐾</span>
            <span>PetReunion</span>
          </Link>
        </nav>
      </header>

      {/* Search Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white py-12">
        <h1 className="text-4xl font-bold text-center mb-8">Search Lost & Found Pets</h1>
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-2xl p-4 grid md:grid-cols-4 gap-4">
            <input
              type="text"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="🔍 Location (city, state, or ZIP)"
              className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={petType}
              onChange={(e) => setPetType(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none"
            >
              <option>All Pets</option>
              <option>Dogs</option>
              <option>Cats</option>
              <option>Other</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none"
            >
              <option>Lost & Found</option>
              <option>Lost Only</option>
              <option>Found Only</option>
            </select>
            <button
              onClick={handleSearch}
              className="bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-3 px-6 rounded-lg hover:from-red-700 hover:to-red-600 transition-all"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-800">Filters</h2>
              </div>

              {/* Status Filter */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3">Status</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.lostPets}
                      onChange={(e) => handleFilterChange('lostPets', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Lost Pets</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.foundPets}
                      onChange={(e) => handleFilterChange('foundPets', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Found Pets</span>
                  </label>
                </div>
              </div>

              {/* Pet Type Filter */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3">Pet Type</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.dogs}
                      onChange={(e) => handleFilterChange('dogs', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Dogs</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.cats}
                      onChange={(e) => handleFilterChange('cats', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Cats</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.other}
                      onChange={(e) => handleFilterChange('other', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Other</span>
                  </label>
                </div>
              </div>

              {/* Size Filter */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3">Size</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.small}
                      onChange={(e) => handleFilterChange('small', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Small</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.medium}
                      onChange={(e) => handleFilterChange('medium', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Medium</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.large}
                      onChange={(e) => handleFilterChange('large', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Large</span>
                  </label>
                </div>
              </div>

              {/* Time Period Filter */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Time Period</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="time"
                      checked={filters.timePeriod === '7days'}
                      onChange={() => handleFilterChange('timePeriod', '7days')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Last 7 days</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="time"
                      checked={filters.timePeriod === '30days'}
                      onChange={() => handleFilterChange('timePeriod', '30days')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-gray-700">Last 30 days</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="time"
                      checked={filters.timePeriod === 'all'}
                      onChange={() => handleFilterChange('timePeriod', 'all')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-gray-700">All time</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Results Area */}
          <main className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Results Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  {petResults.length} Pets in {searchLocation}
                </h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none"
                >
                  <option>Sort: Most Recent</option>
                  <option>Sort: Nearest</option>
                </select>
              </div>

              {/* Pet Cards Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {petResults.map((pet) => (
                  <div key={pet.id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className={`h-64 bg-gradient-to-br ${pet.gradient} flex items-center justify-center relative`}>
                      <span className="text-6xl">{pet.emoji}</span>
                      <span className={`absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-bold text-white ${
                        pet.status === 'Lost' 
                          ? 'bg-red-500' 
                          : 'bg-green-500'
                      }`}>
                        {pet.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{pet.name}</h3>
                      <div className="text-gray-600 mb-3">
                        <div>{pet.type}</div>
                        <div>{pet.details}</div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{pet.location}</span>
                      </div>
                      <div className={`font-semibold text-sm mb-4 ${
                        pet.status === 'Lost' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {pet.timeAgo}
                      </div>
                      <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
