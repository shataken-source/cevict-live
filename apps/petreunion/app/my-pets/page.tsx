'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2, Clock,
  Eye,
  Heart, Loader2,
  MapPin,
  Search,
  Share2,
  Sparkles,
  TrendingUp
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import SocialPostButton from '@/components/SocialPostButton';
import ShareButton from '@/components/ShareButton';

interface Pet {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string;
  color: string;
  size: string | null;
  date_lost: string;
  location_city: string;
  location_state: string | null;
  description: string | null;
  photo_url: string | null;
  status: string;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  created_at: string;
  updated_at: string;
  stats?: {
    totalSearches: number;
    matchAttempts: number;
    lastSearchTime: string | null;
    isActive: boolean;
    recentMatches: any[];
  };
}

export default function MyPetsPage() {
  const [searchType, setSearchType] = useState<'email' | 'phone' | 'name'>('email');
  const [searchValue, setSearchValue] = useState('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const runSearch = useCallback(
    async (searchTypeToUse: 'email' | 'phone' | 'name', searchValueToUse: string, saveSearch: boolean = true) => {
      if (!searchValueToUse.trim()) {
        setError('Please enter your email, phone, or name');
        return;
      }

      setLoading(true);
      setError('');
      setPets([]);
      setHasSearched(true);

      try {
        const response = await fetch(
          `/api/petreunion/find-my-pet?type=${searchTypeToUse}&value=${encodeURIComponent(searchValueToUse)}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          // Fetch detailed stats for each pet
          const petsWithStats = await Promise.all(
            (data.pets || []).map(async (pet: Pet) => {
              try {
                const statsResponse = await fetch(`/api/petreunion/pet/${pet.id}/stats`);
                const statsData = await statsResponse.json();
                if (statsResponse.ok && statsData.success) {
                  return { ...pet, stats: statsData.stats };
                }
              } catch (e) {
                console.error('Error fetching stats for pet:', e);
              }
              return pet;
            })
          );

          setPets(petsWithStats);

          if (petsWithStats.length === 0) {
            setError("No pets found. Make sure you're using the same email/phone/name you used when reporting.");
          } else if (saveSearch) {
            // Save search for future visits
            localStorage.setItem(
              'petreunion_my_pets_search',
              JSON.stringify({
                type: searchTypeToUse,
                value: searchValueToUse,
              })
            );
          }
        } else {
          setError(data.error || 'Failed to search for your pets');
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSearch = useCallback(() => runSearch(searchType, searchValue, true), [runSearch, searchType, searchValue]);

  // Load pets from localStorage if available
  useEffect(() => {
    const savedSearch = localStorage.getItem('petreunion_my_pets_search');
    if (savedSearch) {
      try {
        const saved = JSON.parse(savedSearch);
        setSearchType(saved.type);
        setSearchValue(saved.value);
        if (saved.value) {
          runSearch(saved.type, saved.value, false);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [runSearch]);

  const refreshPets = async () => {
    if (!searchValue.trim()) return;
    setRefreshing(true);
    await runSearch(searchType, searchValue, false);
    setRefreshing(false);
  };

  const getNewMatchesCount = (pet: Pet) => {
    if (!pet.stats?.recentMatches) return 0;
    // Consider matches from last 24 hours as "new"
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return pet.stats.recentMatches.filter((match: any) => {
      if (!match.created_at) return false;
      return new Date(match.created_at) > oneDayAgo;
    }).length;
  };

  const getNewScansCount = (pet: Pet) => {
    // If last search was recent (within 24 hours), show as new scan
    if (!pet.stats?.lastSearchTime) return 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Date(pet.stats.lastSearchTime) > oneDayAgo ? 1 : 0;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Heart className="w-10 h-10 text-pink-500" />
            My Pets
          </h1>
          <p className="text-xl text-gray-600">
            Track your lost & found pets, new scans, and possible matches
          </p>
        </div>

        {/* Search Form */}
        {!hasSearched && (
          <Card className="max-w-2xl mx-auto mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Find Your Pet Reports
              </CardTitle>
              <CardDescription>
                Enter the email, phone number, or name you used when reporting your pet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={searchType === 'email' ? 'default' : 'outline'}
                    onClick={() => setSearchType('email')}
                    className="flex-1"
                  >
                    Email
                  </Button>
                  <Button
                    variant={searchType === 'phone' ? 'default' : 'outline'}
                    onClick={() => setSearchType('phone')}
                    className="flex-1"
                  >
                    Phone
                  </Button>
                  <Button
                    variant={searchType === 'name' ? 'default' : 'outline'}
                    onClick={() => setSearchType('name')}
                    className="flex-1"
                  >
                    Name
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={searchType === 'email' ? 'email' : searchType === 'phone' ? 'tel' : 'text'}
                    placeholder={
                      searchType === 'email'
                        ? 'your@email.com'
                        : searchType === 'phone'
                          ? '(555) 123-4567'
                          : 'Your name'
                    }
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={() => handleSearch()} disabled={loading || !searchValue.trim()}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="max-w-2xl mx-auto mb-8 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {pets.length > 0 && (
          <div className="space-y-6">
            {/* Header with refresh */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Pet Reports ({pets.length})
                </h2>
                <p className="text-gray-600 mt-1">
                  Last updated: {formatDate(pets[0]?.stats?.lastSearchTime || null)}
                </p>
              </div>
              <Button
                onClick={refreshPets}
                disabled={refreshing}
                variant="outline"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>

            {/* Pet Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {pets.map((pet) => {
                const newMatches = getNewMatchesCount(pet);
                const newScans = getNewScansCount(pet);
                const hasUpdates = newMatches > 0 || newScans > 0;
                const location = [pet.location_city, pet.location_state].filter(Boolean).join(', ');

                return (
                  <Card
                    key={pet.id}
                    className={`hover:shadow-xl transition-all ${hasUpdates ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
                      }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-xl">
                              {pet.pet_name || 'Unnamed Pet'}
                            </CardTitle>
                            {hasUpdates && (
                              <Badge className="bg-blue-500 text-white animate-pulse">
                                <Sparkles className="w-3 h-3 mr-1" />
                                New Updates
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {location || pet.location_city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Lost {new Date(pet.date_lost).toLocaleDateString()}
                            </span>
                          </CardDescription>
                        </div>
                        {pet.photo_url && (
                          <img
                            src={pet.photo_url}
                            alt={pet.pet_name || 'Pet'}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Pet Info */}
                        <div className="text-sm text-gray-600">
                          <p><strong>Breed:</strong> {pet.breed}</p>
                          <p><strong>Color:</strong> {pet.color}</p>
                          {pet.description && (
                            <p className="mt-2 italic">{pet.description}</p>
                          )}
                        </div>

                        {/* Stats & Updates */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {pet.stats?.totalSearches || 0}
                            </div>
                            <div className="text-xs text-gray-600">Total Scans</div>
                            {newScans > 0 && (
                              <Badge className="mt-1 bg-green-500 text-white text-xs">
                                +{newScans} new
                              </Badge>
                            )}
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {pet.stats?.matchAttempts || 0}
                            </div>
                            <div className="text-xs text-gray-600">Match Attempts</div>
                            {newMatches > 0 && (
                              <Badge className="mt-1 bg-orange-500 text-white text-xs">
                                +{newMatches} new
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Recent Matches Preview */}
                        {pet.stats?.recentMatches && pet.stats.recentMatches.length > 0 && (
                          <div className="pt-4 border-t">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-gray-700">
                                Recent Matches ({pet.stats.recentMatches.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {pet.stats.recentMatches.slice(0, 3).map((match: any, idx: number) => (
                                <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                  <span>
                                    {match.matchScore || 'N/A'}% match - {match.location_city || 'Unknown'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Link href={`/my-pet/${pet.id}`} className="flex-1">
                            <Button className="w-full" variant="default">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                          <Link href={`/lost/${pet.id}`} className="flex-1">
                            <Button className="w-full" variant="outline">
                              <Share2 className="w-4 h-4 mr-2" />
                              Public View
                            </Button>
                          </Link>
                        </div>

                        {/* Repost Fast */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t items-center justify-between">
                          <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Share2 className="w-4 h-4" />
                            Repost
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <SocialPostButton petId={pet.id} />
                            <ShareButton
                              petId={pet.id}
                              petName={pet.pet_name || 'My Pet'}
                              petType={pet.pet_type}
                              location={location}
                              photoUrl={pet.photo_url}
                            />
                          </div>
                        </div>

                        {/* Last Activity */}
                        {pet.stats?.lastSearchTime && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 pt-2 border-t">
                            <Clock className="w-3 h-3" />
                            Last scan: {formatDate(pet.stats.lastSearchTime)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href="/report">
                    <Button variant="outline">
                      <Heart className="w-4 h-4 mr-2" />
                      Report Another Pet
                    </Button>
                  </Link>
                  <Link href="/search">
                    <Button variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Search Lost Pets
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {hasSearched && pets.length === 0 && !loading && !error && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Pets Found</h3>
              <p className="text-gray-600 mb-4">
                We couldn't find any pets associated with that {searchType}.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Try:</p>
                <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
                  <li>Using a different email, phone, or name</li>
                  <li>Checking your spelling</li>
                  <li>Reporting a new pet if you haven't yet</li>
                </ul>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <Button onClick={() => setHasSearched(false)} variant="outline">
                  Try Again
                </Button>
                <Link href="/report">
                  <Button>
                    <Heart className="w-4 h-4 mr-2" />
                    Report a Pet
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

