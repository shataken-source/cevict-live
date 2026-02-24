'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Calendar, Loader2, Filter, X, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

function SearchLostPetsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    pet_type: '',
    location_state: '',
    location_city: '',
    status: 'all', // Added status filter
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
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.pet_type) params.append('type', filters.pet_type);
      if (filters.location_state) params.append('state', filters.location_state);
      if (filters.location_city) params.append('city', filters.location_city);

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
      if (filters.pet_type) params.append('type', filters.pet_type);
      if (filters.location_state) params.append('state', filters.location_state);
      if (filters.location_city) params.append('city', filters.location_city);

      const response = await fetch(`/api/petreunion/search-for-lost-pet?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPets(data.pets || []);
      } else {
        console.error('Search error:', data.error);
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
    // Reload when filters change
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      loadRecentPets();
    }
  }, [filters.status, filters.pet_type, filters.location_state, filters.location_city]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const clearFilters = () => {
    setFilters({ pet_type: '', location_state: '', location_city: '', status: 'all' });
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      loadRecentPets();
    }
  };

  const hasActiveFilters = filters.pet_type || filters.location_state || filters.location_city || filters.status !== 'all';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Search className="w-10 h-10 text-blue-600" />
            Search Lost Pets
          </h1>
          <p className="text-gray-600 text-lg">
            Found a pet? Search our database to find their owner
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Search by breed, color, city, description, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Filters */}
              <div className="grid md:grid-cols-5 gap-3 pt-4 border-t">
                <Select
                  value={filters.status}
                  onValueChange={(value) => {
                    setFilters({ ...filters, status: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="found">Found</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.pet_type}
                  onValueChange={(value) => {
                    setFilters({ ...filters, pet_type: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pet Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="dog">Dog</SelectItem>
                    <SelectItem value="cat">Cat</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.location_state}
                  onValueChange={(value) => {
                    setFilters({ ...filters, location_state: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    <SelectItem value="Alabama">Alabama</SelectItem>
                    <SelectItem value="Florida">Florida</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Mississippi">Mississippi</SelectItem>
                    <SelectItem value="Louisiana">Louisiana</SelectItem>
                    <SelectItem value="Texas">Texas</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="text"
                  placeholder="City"
                  value={filters.location_city}
                  onChange={(e) => {
                    setFilters({ ...filters, location_city: e.target.value });
                  }}
                />

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {loading && pets.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Searching...</p>
          </div>
        ) : pets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No pets found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'No lost pets in the database yet'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Search
                </Button>
                <Link href="/petreunion/report">
                  <Button>Report a Lost Pet</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-gray-600">
              Found {pets.length} pet{pets.length !== 1 ? 's' : ''}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pets.map((pet) => (
                <Link key={pet.id} href={`/petreunion/lost/${pet.id}`}>
                  <Card className="hover:shadow-xl transition-all cursor-pointer h-full">
                    {pet.photo_url && (
                      <div className="w-full h-64 bg-gray-100 rounded-t-lg overflow-hidden">
                        <img
                          src={pet.photo_url}
                          alt={pet.pet_name || 'Lost pet'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl">
                        {pet.pet_name || 'Unknown Name'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {pet.location_city}, {pet.location_state}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {pet.pet_type}
                          </span>
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {pet.breed}
                          </span>
                          <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded">
                            {pet.color}
                          </span>
                        </div>
                        {pet.size && (
                          <div className="text-sm text-gray-600">
                            Size: {pet.size}
                          </div>
                        )}
                        {pet.date_lost && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            Lost: {new Date(pet.date_lost).toLocaleDateString()}
                          </div>
                        )}
                        {pet.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {pet.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchLostPetsPage() {
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

