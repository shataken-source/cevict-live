/**
 * Unified Search Page
 * 
 * Route: /search
 * Provides comprehensive search across vessels, captains, and bookings
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { Input } from '../src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { Search, MapPin, Users, Calendar, DollarSign, Star, Anchor, User } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';

type SearchResult = {
  type: 'vessel' | 'captain' | 'booking';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  metadata?: Record<string, any>;
};

export default function SearchPage() {
  const router = useRouter();
  const { q, type } = router.query;
  
  const [searchQuery, setSearchQuery] = useState<string>((q as string) || '');
  const [activeTab, setActiveTab] = useState<string>((type as string) || 'all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Update URL when search changes
  useEffect(() => {
    if (searchQuery && hasSearched) {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (activeTab !== 'all') params.set('type', activeTab);
      router.replace(`/search?${params.toString()}`, undefined, { shallow: true });
    }
  }, [searchQuery, activeTab, hasSearched, router]);

  // Load initial query from URL
  useEffect(() => {
    if (q && typeof q === 'string') {
      setSearchQuery(q);
      setHasSearched(true);
      performSearch(q, (type as string) || 'all');
    }
  }, [q, type]);

  const performSearch = async (query: string, filterType: string) => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    const searchResults: SearchResult[] = [];
    const searchTerm = query.toLowerCase().trim();

    try {
      // Search Vessels
      if (filterType === 'all' || filterType === 'vessels') {
        const { data: vessels, error: vesselsError } = await supabase
          .from('vessels')
          .select('id, name, type, home_port, price, rating, photos, capacity, specialties, available')
          .or(`name.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,home_port.ilike.%${searchTerm}%`)
          .limit(20);

        if (!vesselsError && vessels) {
          vessels.forEach((vessel: any) => {
            searchResults.push({
              type: 'vessel',
              id: vessel.id,
              title: vessel.name,
              subtitle: `${vessel.type}${vessel.home_port ? ` • ${vessel.home_port}` : ''}`,
              description: vessel.specialties?.join(', ') || '',
              image: Array.isArray(vessel.photos) ? vessel.photos[0] : vessel.photos,
              metadata: {
                price: vessel.price,
                rating: vessel.rating,
                capacity: vessel.capacity,
                available: vessel.available,
              },
            });
          });
        }

        // Also search boats table (legacy)
        const { data: boats, error: boatsError } = await supabase
          .from('boats')
          .select('id, name, type, home_port, price, rating, image, capacity, specialties, available')
          .or(`name.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,home_port.ilike.%${searchTerm}%`)
          .limit(20);

        if (!boatsError && boats) {
          boats.forEach((boat: any) => {
            // Avoid duplicates
            if (!searchResults.find(r => r.id === boat.id && r.type === 'vessel')) {
              searchResults.push({
                type: 'vessel',
                id: boat.id,
                title: boat.name,
                subtitle: `${boat.type}${boat.home_port ? ` • ${boat.home_port}` : ''}`,
                description: boat.specialties?.join(', ') || '',
                image: boat.image || (Array.isArray(boat.photos) ? boat.photos[0] : null),
                metadata: {
                  price: boat.price,
                  rating: boat.rating,
                  capacity: boat.capacity,
                  available: boat.available,
                },
              });
            }
          });
        }
      }

      // Search Captains
      if (filterType === 'all' || filterType === 'captains') {
        const { data: captains, error: captainsError } = await supabase
          .from('captain_profiles')
          .select('id, name, location, specialties, rating, bio, avatar_url')
          .or(`name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,specialties.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
          .limit(20);

        if (!captainsError && captains) {
          captains.forEach((captain: any) => {
            searchResults.push({
              type: 'captain',
              id: captain.id,
              title: captain.name,
              subtitle: captain.location || 'Gulf Coast',
              description: captain.bio || captain.specialties?.join(', ') || '',
              image: captain.avatar_url,
              metadata: {
                rating: captain.rating,
                specialties: captain.specialties,
              },
            });
          });
        }

        // Also search captains table (legacy)
        const { data: captainsLegacy, error: captainsLegacyError } = await supabase
          .from('captains')
          .select('id, name, location, specialties, rating, bio, avatar_url')
          .or(`name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
          .limit(20);

        if (!captainsLegacyError && captainsLegacy) {
          captainsLegacy.forEach((captain: any) => {
            if (!searchResults.find(r => r.id === captain.id && r.type === 'captain')) {
              searchResults.push({
                type: 'captain',
                id: captain.id,
                title: captain.name,
                subtitle: captain.location || 'Gulf Coast',
                description: captain.bio || captain.specialties?.join(', ') || '',
                image: captain.avatar_url,
                metadata: {
                  rating: captain.rating,
                  specialties: captain.specialties,
                },
              });
            }
          });
        }
      }

      // Search Bookings (only for authenticated users)
      if (filterType === 'all' || filterType === 'bookings') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, charter_name, booking_date, booking_time, guests, total_price, status, captain_id')
            .eq('user_id', session.user.id)
            .or(`charter_name.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`)
            .order('booking_date', { ascending: false })
            .limit(20);

          if (!bookingsError && bookings) {
            bookings.forEach((booking: any) => {
              searchResults.push({
                type: 'booking',
                id: booking.id,
                title: booking.charter_name || 'Charter Booking',
                subtitle: booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : '',
                description: `${booking.guests || 0} guests • ${booking.status || 'pending'}`,
                metadata: {
                  date: booking.booking_date,
                  time: booking.booking_time,
                  guests: booking.guests,
                  price: booking.total_price,
                  status: booking.status,
                  captainId: booking.captain_id,
                },
              });
            });
          }
        }
      }

      setResults(searchResults);
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery, activeTab);
  };

  const getResultUrl = (result: SearchResult): string => {
    switch (result.type) {
      case 'vessel':
        return `/vessels/${result.id}`;
      case 'captain':
        return `/captains/${result.id}`;
      case 'booking':
        return `/bookings/${result.id}`;
      default:
        return '#';
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'vessel':
        return <Anchor className="w-5 h-5 text-blue-600" />;
      case 'captain':
        return <User className="w-5 h-5 text-green-600" />;
      case 'booking':
        return <Calendar className="w-5 h-5 text-purple-600" />;
      default:
        return <Search className="w-5 h-5 text-gray-600" />;
    }
  };

  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return results;
    return results.filter(r => r.type === activeTab);
  }, [results, activeTab]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      vessels: [],
      captains: [],
      bookings: [],
    };
    filteredResults.forEach(result => {
      if (result.type === 'vessel') groups.vessels.push(result);
      else if (result.type === 'captain') groups.captains.push(result);
      else if (result.type === 'booking') groups.bookings.push(result);
    });
    return groups;
  }, [filteredResults]);

  return (
    <Layout session={null}>
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search</h1>
          <p className="text-gray-600">Find vessels, captains, and bookings</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search vessels, captains, bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </form>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="vessels">Vessels</TabsTrigger>
            <TabsTrigger value="captains">Captains</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Results */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        )}

        {!loading && hasSearched && filteredResults.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or filters
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && filteredResults.length > 0 && (
          <div className="space-y-6">
            {/* Vessels */}
            {groupedResults.vessels.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Anchor className="w-5 h-5" />
                  Vessels ({groupedResults.vessels.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {groupedResults.vessels.map((result) => (
                    <Link key={result.id} href={getResultUrl(result)}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {result.image ? (
                              <img
                                src={result.image}
                                alt={result.title}
                                className="w-24 h-24 object-cover rounded"
                              />
                            ) : (
                              <div className="w-24 h-24 bg-blue-100 rounded flex items-center justify-center">
                                {getResultIcon(result.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">{result.title}</h3>
                              <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                              {result.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                {result.metadata?.price && (
                                  <span className="text-sm font-semibold text-green-600">
                                    ${result.metadata.price}
                                  </span>
                                )}
                                {result.metadata?.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="text-sm">{Number(result.metadata.rating).toFixed(1)}</span>
                                  </div>
                                )}
                                {result.metadata?.capacity && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Users className="w-4 h-4" />
                                    <span>{result.metadata.capacity}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Captains */}
            {groupedResults.captains.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Captains ({groupedResults.captains.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {groupedResults.captains.map((result) => (
                    <Link key={result.id} href={getResultUrl(result)}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {result.image ? (
                              <img
                                src={result.image}
                                alt={result.title}
                                className="w-24 h-24 object-cover rounded-full"
                              />
                            ) : (
                              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                                {getResultIcon(result.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">{result.title}</h3>
                              <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                              {result.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.description}</p>
                              )}
                              {result.metadata?.rating && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm">{Number(result.metadata.rating).toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings */}
            {groupedResults.bookings.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Bookings ({groupedResults.bookings.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {groupedResults.bookings.map((result) => (
                    <Link key={result.id} href={getResultUrl(result)}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{result.title}</h3>
                              <p className="text-sm text-gray-600">{result.subtitle}</p>
                              <p className="text-xs text-gray-500 mt-1">{result.description}</p>
                              {result.metadata?.price && (
                                <p className="text-sm font-semibold text-green-600 mt-2">
                                  ${result.metadata.price}
                                </p>
                              )}
                            </div>
                            <Badge variant={result.metadata?.status === 'completed' ? 'default' : 'secondary'}>
                              {result.metadata?.status || 'pending'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !hasSearched && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start searching</h3>
              <p className="text-gray-600">
                Enter a search term above to find vessels, captains, or bookings
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
