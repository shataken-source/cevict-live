'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Heart,
  Loader2,
  MapPin,
  Search,
  Star,
  User,
  X
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import ShareButton from '@/components/ShareButton';

function SearchLostPetsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    pet_type: 'all',
    location_state: 'all',
    location_city: '',
    status: 'all',
    date_range: 'all'
  });

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    } else {
      loadRecentPets();
    }
  }, []);

  const loadRecentPets = async () => {
    setLoading(true);
    setError(null);
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
        const baseMessage = (typeof data?.error === 'string' && data.error) ? data.error : 'Failed to load pets';
        const shouldSuggestRetry = data?.code === 'SERVICE_QUOTA_EXCEEDED' || data?.code === 'SERVICE_UNAVAILABLE';
        const retryAfterSeconds = typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;
        const retryNote = shouldSuggestRetry
          ? retryAfterSeconds
            ? ` Please try again in about ${Math.max(1, Math.round(retryAfterSeconds / 60))} minutes.`
            : ' Please try again later.'
          : '';
        setError(`${baseMessage}${retryNote}`);
        setPets([]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
      setError('Service temporarily unavailable. Please try again later.');
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
    setError(null);
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
      } else {
        const baseMessage = (typeof data?.error === 'string' && data.error) ? data.error : 'Failed to search pets';
        const shouldSuggestRetry = data?.code === 'SERVICE_QUOTA_EXCEEDED' || data?.code === 'SERVICE_UNAVAILABLE';
        const retryAfterSeconds = typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;
        const retryNote = shouldSuggestRetry
          ? retryAfterSeconds
            ? ` Please try again in about ${Math.max(1, Math.round(retryAfterSeconds / 60))} minutes.`
            : ' Please try again later.'
          : '';
        setError(`${baseMessage}${retryNote}`);
        setPets([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Service temporarily unavailable. Please try again later.');
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
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      loadRecentPets();
    }
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

  const formatLocation = (pet: any) => {
    const city = typeof pet?.location_city === 'string' ? pet.location_city : '';
    const state = typeof pet?.location_state === 'string' ? pet.location_state : '';
    const combined = `${city}${city && state ? ', ' : ''}${state}`.trim();
    return combined || 'Unknown location';
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
              Together We Bring Them Home - Search our database to reunite pets with their families
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <Card className="mb-8 shadow-lg border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by breed, color, city, description, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 text-lg font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Search className="w-5 h-5 mr-2" />
                  )}
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-6 py-4"
                >
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {Object.values(filters).filter(v => v !== 'all' && v !== '').length}
                    </span>
                  )}
                </Button>
              </div>

              {/* Quick Search Tips */}
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-gray-500">Popular searches:</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('Golden Retriever')}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Golden Retriever
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('orange cat')}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  orange cat
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('Miami')}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Miami
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('Labrador')}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Labrador
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-8 shadow-lg border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Search Filters</CardTitle>
                  <CardDescription>Narrow down your search results</CardDescription>
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pet Type
                  </label>
                  <Select
                    value={filters.pet_type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, pet_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="dog">🐕 Dogs</SelectItem>
                      <SelectItem value="cat">🐈 Cats</SelectItem>
                      <SelectItem value="bird">🦜 Birds</SelectItem>
                      <SelectItem value="other">🐾 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="lost">🔴 Lost</SelectItem>
                      <SelectItem value="found">🔵 Found</SelectItem>
                      <SelectItem value="reunited">🟢 Reunited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <Select
                    value={filters.location_state}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, location_state: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All states" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      <SelectItem value="FL">Florida</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="TX">Texas</SelectItem>
                      <SelectItem value="NY">New York</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter city"
                    value={filters.location_city}
                    onChange={(e) => setFilters(prev => ({ ...prev, location_city: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <Select
                    value={filters.date_range}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, date_range: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'Recent Pet Reports'}
            </h2>
            <p className="text-gray-600">
              {loading ? 'Searching...' : `${pets.length} pet${pets.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          {!loading && pets.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-2" />
                Save Search
              </Button>
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Subscribe
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

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
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                          {pet.pet_name || 'Unknown Pet'}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {pet.breed || 'Unknown breed'} • {pet.pet_type || 'Unknown'}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(pet.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {formatLocation(pet)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {pet.date_lost || pet.date_found ? formatDate(pet.date_lost || pet.date_found) : 'Unknown date'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      Reported {pet.created_at ? formatDate(pet.created_at) : 'recently'}
                    </div>
                    {pet.description && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {pet.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col gap-2">
                      <Link href={`/pets/${pet.id}`}>
                        <Button className="w-full group-hover:bg-blue-600 transition-colors">
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      <ShareButton
                        petId={pet.id}
                        petName={pet.pet_name || 'Unknown Pet'}
                        petType={pet.pet_type || 'pet'}
                        location={formatLocation(pet)}
                        photoUrl={pet.photo_url || undefined}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && pets.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No pets found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? `No pets found matching "${searchQuery}". Try adjusting your search terms or filters.`
                : 'No pets found. Try adjusting your filters or check back later.'
              }
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button onClick={() => setSearchQuery('')}>
                Show All Pets
              </Button>
            </div>
          </div>
        )}

        {/* Help Section */}
        {!loading && pets.length > 0 && (
          <div className="mt-12 bg-blue-50 rounded-xl p-8 border border-blue-200">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Can't Find What You're Looking For?</h3>
              <p className="text-blue-800 mb-6 max-w-2xl mx-auto">
                If you haven't found the pet you're looking for, consider reporting it to our community.
                Thousands of pet lovers are ready to help reunite lost pets with their families.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/report/lost">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Report Lost Pet
                  </Button>
                </Link>
                <Link href="/report/found">
                  <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Report Found Pet
                  </Button>
                </Link>
              </div>
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
