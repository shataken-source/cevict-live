'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Heart, Search, MapPin, Clock, Shield, Sparkles, TrendingUp, Users, CheckCircle2, ArrowRight, Bell, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PetReunionHome() {
  const [stats, setStats] = useState({ total: 0, found: 0, active: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPets, setRecentPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load stats via API route (avoids require issues)
  useEffect(() => {
    async function loadStats() {
      try {
        // Fetch stats from API
        const statsResponse = await fetch('/api/petreunion/stats');
        const statsData = await statsResponse.json();

        if (statsResponse.ok && statsData.table_exists) {
          setStats({
            total: statsData.total_pets || 0,
            found: statsData.by_status?.found || 0,
            active: statsData.by_status?.lost || 0,
          });
        } else {
          // Table doesn't exist or error
          setStats({ total: 0, found: 0, active: 0 });
        }

        // Fetch recent pets from verify-database API
        const recentResponse = await fetch('/api/petreunion/verify-database');
        const recentData = await recentResponse.json();

        if (recentResponse.ok && recentData.sampleRecords) {
          // Filter to only lost pets and limit to 6
          const lostPets = recentData.sampleRecords
            .filter((pet: any) => pet.status === 'lost')
            .slice(0, 6);
          setRecentPets(lostPets);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/petreunion/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full p-4 mb-6">
              <Heart className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              PetReunion
            </h1>
            <p className="text-2xl md:text-3xl mb-2 opacity-90">
              FREE Lost Pet Recovery Service
            </p>
            <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto">
              We help reunite lost pets with their families. 100% free, no registration required.
            </p>
          </div>

          {/* Quick Search */}
          <Card className="max-w-2xl mx-auto mt-8 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Search by breed, color, city, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-gray-900"
                />
                <Button type="submit" size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Section */}
      {!loading && (
        <div className="max-w-6xl mx-auto px-4 -mt-12 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-blue-700 mb-2">{stats.total}</div>
                <div className="text-gray-700">Total Pets in Database</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-green-700 mb-2">{stats.found}</div>
                <div className="text-gray-700">Successfully Reunited</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-purple-700 mb-2">{stats.active}</div>
                <div className="text-gray-700">Currently Searching</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Actions */}
      <div className="max-w-6xl mx-auto px-4 mb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Find My Pet Report */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl text-purple-700">Find My Pet Report</CardTitle>
              </div>
              <CardDescription className="text-base">
                Already reported your pet? Check search activity and stats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>View search activity</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>See match attempts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Track search progress</span>
                </li>
              </ul>
              <Link href="/petreunion/find-my-pet">
                <Button size="lg" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  Find My Pet
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Report Lost Pet */}
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-red-100 p-3 rounded-full">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-red-700">Report a Lost Pet</CardTitle>
              </div>
              <CardDescription className="text-base">
                Your pet is missing? We're here to help. Report your lost pet in less than 2 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Instant database search</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>PROGNO-powered search areas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Printable lost pet flyer</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Daily automated searches</span>
                </li>
              </ul>
              <Link href="/petreunion/report">
                <Button size="lg" className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
                  Report Lost Pet
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Search Lost Pets */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-blue-700">Search Lost Pets</CardTitle>
              </div>
              <CardDescription className="text-base">
                Found a pet? Search our database to find their owner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Search by location, breed, color</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>View photos and descriptions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Contact owners directly</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Age progression matching</span>
                </li>
              </ul>
              <div className="flex gap-2">
                <Link href="/petreunion/search" className="flex-1">
                  <Button size="lg" className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                    Search Database
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/petreunion/image-match" className="flex-1">
                  <Button size="lg" variant="outline" className="w-full border-2 border-blue-300">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Image Match
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 mb-16">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">Why PetReunion?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle>100% Free</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                No registration, no fees, no hidden costs. We're here to help, period.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle>AI-Powered Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                PROGNO technology determines the best areas to search based on your pet's behavior.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle>24/7 Automated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We search shelters and databases continuously, even while you sleep.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Lost Pets */}
      {recentPets.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Recently Reported Lost Pets</h2>
            <Link href="/petreunion/search">
              <Button variant="outline">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {recentPets.map((pet) => (
              <Link key={pet.id} href={`/petreunion/lost/${pet.id}`}>
                <Card className="hover:shadow-xl transition-all cursor-pointer h-full">
                  {pet.photo_url && (
                    <div className="w-full h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                      <img
                        src={pet.photo_url}
                        alt={pet.pet_name || 'Lost pet'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {pet.pet_name || 'Unknown Name'} - {pet.breed}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {pet.location_city}, {pet.location_state}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {pet.pet_type}
                      </span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {pet.color}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* For Shelters */}
      <div className="max-w-6xl mx-auto px-4 mb-16">
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-3 rounded-full">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-indigo-700">For Animal Shelters</CardTitle>
                <CardDescription className="text-base">
                  Use PetReunion as your office software for managing lost and found pets
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-2 text-gray-900">Features:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Quick pet intake</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Advanced search with age progression</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Automatic database matching</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Shelter-specific login</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-gray-900">Benefits:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Free to use</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Streamlined workflow</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Better reunification rates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Easy to learn</span>
                  </li>
                </ul>
              </div>
            </div>
            <Link href="/petreunion/shelter/login">
              <Button size="lg" className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                Shelter Login
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Pet?</h2>
          <p className="text-xl mb-6 opacity-90">
            Join thousands of pet owners who have successfully reunited with their pets
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/petreunion/report">
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                Report Lost Pet
              </Button>
            </Link>
            <Link href="/petreunion/search">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Search Database
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
