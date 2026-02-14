'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  MapPin,
  Calendar,
  Loader2,
  Filter,
  X,
  Heart,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import ImageSearchWidget from '../components/ImageSearchWidget';

function SearchLostPetsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    pet_type: 'all',
    location_state: 'all',
    location_city: '',
    status: 'all',
    date_range: 'all'
  });

  // Don't auto-load on page load - wait for user to search
  // useEffect(() => {
  //   if (initialQuery) {
  //     performSearch(initialQuery);
  //   } else {
  //     loadRecentPets();
  //   }
  // }, []);

  const loadRecentPets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.pet_type !== 'all') params.append('type', filters.pet_type);
      if (filters.location_state !== 'all') params.append('state', filters.location_state);
      if (filters.location_city) params.append('city', filters.location_city);
      if (filters.date_range !== 'all') params.append('date_range', filters.date_range);

      const response = await fetch(`/api/petreunion/search-for-lost-pet?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPets(data.pets || []);
      } else {
        console.error('Error loading pets:', data.error);
        setPets([]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      loadRecentPets();
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.pet_type !== 'all') params.append('type', filters.pet_type);
      if (filters.location_state !== 'all') params.append('state', filters.location_state);
      if (filters.location_city) params.append('city', filters.location_city);
      if (filters.date_range !== 'all') params.append('date_range', filters.date_range);

      const response = await fetch(`/api/petreunion/search-for-lost-pet?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPets(data.pets || []);
        console.log(`Search for "${query}": Found ${data.pets?.length || 0} pets`);
      } else {
        console.error('Search error:', data.error);
        console.error('Response status:', response.status);
        setPets([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      loadRecentPets();
    }
  }, [filters.status, filters.pet_type, filters.location_state, filters.location_city, filters.date_range]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const clearFilters = () => {
    setFilters({ pet_type: 'all', location_state: 'all', location_city: '', status: 'all', date_range: 'all' });
    // Don't auto-search after clearing filters - user must click search
    setPets([]);
  };

  const hasActiveFilters = filters.pet_type !== 'all' || filters.location_state !== 'all' || filters.location_city || filters.status !== 'all' || filters.date_range !== 'all';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lost':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Lost
        </span>;
      case 'found':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Found
        </span>;
      case 'reunited':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Heart className="w-3 h-3 mr-1" />
          Reunited
        </span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              Search Lost Pets
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Together We Bring Them Home — search our database. Completely free, no sign-up required.
            </p>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl mx-auto">
              Tip: Add city or zip for better results. Try a photo search above for visual matches. New to searching? See our <Link href="/first-24-hours" className="text-blue-600 hover:underline">First 24 hours guide</Link>.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Image Search Widget */}
        <ImageSearchWidget />

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by breed, color, city, description, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white"
                  style={{ color: '#111827' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 text-lg font-semibold text-white rounded-lg disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Search className="w-5 h-5 mr-2" />
                )}
                Search
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-5 h-5 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {Object.values(filters).filter(v => v !== 'all' && v !== '').length}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Searching our database...</p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map((pet, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {pet.pet_name || ''}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {pet.breed ? `${pet.breed} • ` : ''}{pet.pet_type || ''}
                    </p>
                  </div>
                  {getStatusBadge(pet.status)}
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {pet.location_city && pet.location_state 
                      ? `${pet.location_city}, ${pet.location_state}`
                      : pet.location_city 
                        ? pet.location_city
                        : pet.location_state
                          ? pet.location_state
                          : pet.location || ''}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {pet.date_lost ? formatDate(pet.date_lost) : pet.date_found ? formatDate(pet.date_found) : ''}
                  </div>
                </div>
                {pet.description && (
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {pet.description}
                  </p>
                )}
                <Link href={`/lost/${pet.id}`}>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center">
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* No Results / Initial State */}
        {!loading && pets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-lg">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No pets found' : 'Search for Lost Pets'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? `No pets found matching "${searchQuery}". Try adjusting your search terms or clearing filters.`
                : 'Enter a search term above to find lost pets. You can search by breed, color, city, description, or pet name.'
              }
            </p>
            <div className="flex gap-3 justify-center">
              {searchQuery && (
                <button onClick={clearFilters} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Clear Filters
                </button>
              )}
              <Link href="/report/lost">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Report Lost Pet
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <SearchLostPetsContent />
    </Suspense>
  );
}
