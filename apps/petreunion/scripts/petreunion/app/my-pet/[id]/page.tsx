'use client';

import FacebookFlyerPost from '@/components/petreunion/FacebookFlyerPost';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2, Clock,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Share2,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Pet {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string;
  color: string;
  size: string | null;
  date_lost: string;
  location_city: string;
  location_state: string;
  description: string | null;
  photo_url: string | null;
  status: string;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  created_at: string;
}

interface SearchStats {
  totalSearches: number;
  matchAttempts: number;
  lastSearchTime: string | null;
  isActive: boolean;
  recentMatches: any[];
  searchHistory: any[];
}

export default function MyPetPage() {
  const params = useParams();
  const id = (params?.id as string) || '';

  const [pet, setPet] = useState<Pet | null>(null);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPet() {
      if (!id) {
        setError('Invalid pet ID');
        setLoading(false);
        return;
      }

      try {
        // Fetch pet data
        const petResponse = await fetch(`/api/petreunion/pet/${id}`);
        const petData = await petResponse.json();

        if (!petResponse.ok) {
          throw new Error(petData.error || 'Failed to fetch pet report');
        }
        setPet(petData.pet);

        // Fetch search stats
        const statsResponse = await fetch(`/api/petreunion/pet/${id}/stats`);
        const statsData = await statsResponse.json();

        if (statsResponse.ok && statsData.success) {
          setStats(statsData.stats);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load pet report');
      } finally {
        setLoading(false);
      }
    }

    fetchPet();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Pet Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'Unable to load pet report'}</p>
            <Link href="/petreunion/find-my-pet">
              <Button>Search for My Pet</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysLost = Math.floor((Date.now() - new Date(pet.date_lost).getTime()) / (1000 * 60 * 60 * 24));
  const isActive = stats?.isActive || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Heart className="w-10 h-10 text-pink-600" />
              {pet.pet_name || 'My Pet'} - Search Activity
            </h1>
            <p className="text-gray-600 text-lg">
              Your pet is being actively searched for
            </p>
          </div>
          <Link href="/petreunion/find-my-pet">
            <Button variant="outline">
              ← Find Another Pet
            </Button>
          </Link>
        </div>

        {/* Active Status Banner */}
        {isActive ? (
          <Card className="mb-6 border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-green-600 animate-pulse" />
                <div>
                  <h3 className="text-xl font-bold text-green-900">Active Search in Progress</h3>
                  <p className="text-green-700">
                    Your pet was last searched {stats?.lastSearchTime ?
                      `${Math.floor((Date.now() - new Date(stats.lastSearchTime).getTime()) / (1000 * 60 * 60))} hours ago` :
                      'recently'
                    }. We're actively looking for matches!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-yellow-500 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div>
                  <h3 className="text-xl font-bold text-yellow-900">Search Status</h3>
                  <p className="text-yellow-700">
                    {stats?.lastSearchTime ?
                      `Last searched ${Math.floor((Date.now() - new Date(stats.lastSearchTime).getTime()) / (1000 * 60 * 60 * 24))} days ago` :
                      'No searches recorded yet'
                    }. Continuous search is running in the background.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Pet Info Card */}
          <Card>
            {pet.photo_url && (
              <div className="w-full h-64 bg-gray-100 rounded-t-lg overflow-hidden">
                <img src={pet.photo_url} alt={pet.pet_name || 'Pet'} className="w-full h-full object-cover" />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{pet.pet_name || 'Unknown Name'}</CardTitle>
              <CardDescription>
                {pet.pet_type} • {pet.breed} • {pet.color}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{pet.location_city}, {pet.location_state}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Lost {daysLost} day{daysLost !== 1 ? 's' : ''} ago</span>
              </div>
              {pet.owner_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{pet.owner_phone}</span>
                </div>
              )}
              {pet.owner_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{pet.owner_email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Stats */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Search Activity
              </CardTitle>
              <CardDescription>
                How many times we've searched for your pet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total Searches</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-900">
                    {stats?.totalSearches || 0}
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Database searches performed
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Match Checks</span>
                  </div>
                  <div className="text-3xl font-bold text-green-900">
                    {stats?.matchAttempts || 0}
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Potential matches reviewed
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Last Search</span>
                  </div>
                  <div className="text-lg font-bold text-purple-900">
                    {stats?.lastSearchTime ?
                      new Date(stats.lastSearchTime).toLocaleDateString() :
                      'Never'
                    }
                  </div>
                  <p className="text-xs text-purple-700 mt-1">
                    {stats?.lastSearchTime ?
                      `${Math.floor((Date.now() - new Date(stats.lastSearchTime).getTime()) / (1000 * 60 * 60))} hours ago` :
                      'No searches yet'
                    }
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Days Lost</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-900">
                    {daysLost}
                  </div>
                  <p className="text-xs text-orange-700 mt-1">
                    Since reported missing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {stats && stats.recentMatches && stats.recentMatches.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-6 h-6 text-yellow-600" />
                Recent Potential Matches
              </CardTitle>
              <CardDescription>
                Pets that were checked as potential matches for your pet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentMatches.slice(0, 5).map((match: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    {match.photo_url && (
                      <img src={match.photo_url} alt="Match" className="w-16 h-16 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{match.pet_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">
                        {match.breed} • {match.color} • {match.location_city}, {match.location_state}
                      </div>
                      {match.matchScore && (
                        <div className="text-xs text-blue-600 mt-1">
                          Match Score: {match.matchScore}/100
                        </div>
                      )}
                    </div>
                    <Link href={`/lost/${match.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reassurance Message */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Heart className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">
                  Your Pet is Still Being Searched For
                </h3>
                <p className="text-blue-800 mb-4">
                  We're actively searching our database and monitoring shelters for pets matching {pet.pet_name || 'your pet'}'s description.
                  Every time a new pet is added to our system, we automatically check if it might be a match.
                </p>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Continuous background search enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Monitoring shelters in your area</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Checking new pet listings daily</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facebook Flyer Post */}
        {pet && (
          <Card className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-blue-700">
                <Share2 className="w-6 h-6" />
                Post Flyer to Facebook
              </CardTitle>
              <CardDescription className="text-base">
                One-click button to format and post your lost pet flyer on Facebook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FacebookFlyerPost
                pet={pet}
                petUrl={typeof window !== 'undefined' ? `${window.location.origin}/lost/${pet.id}` : `/lost/${pet.id}`}
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href={`/lost/${pet.id}`}>
              <Button variant="outline">
                View Public Listing
              </Button>
            </Link>
            <Link href="/report">
              <Button variant="outline">
                Update Pet Info
              </Button>
            </Link>
            <Link href="/">
              <Button>
                Back to PetReunion
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

