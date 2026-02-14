'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, Phone, User, Loader2, Heart, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function FindMyPetPage() {
  const [searchType, setSearchType] = useState<'email' | 'phone' | 'name'>('email');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setLoading(true);
    setError('');
    setPets([]);

    try {
      const response = await fetch(`/api/petreunion/find-my-pet?type=${searchType}&value=${encodeURIComponent(searchValue)}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPets(data.pets || []);
        if (data.pets.length === 0) {
          setError('No pets found. Make sure you\'re using the same email/phone/name you used when reporting.');
        }
      } else {
        setError(data.error || 'Failed to search for your pet');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Heart className="w-10 h-10 text-pink-600" />
            Find My Pet Report
          </h1>
          <p className="text-gray-600 text-lg">
            Search for your lost pet report to see search activity and match attempts
          </p>
        </div>

        {/* Search Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search for Your Pet</CardTitle>
            <CardDescription>
              Enter the email, phone, or name you used when reporting your pet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Search Type Tabs */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={searchType === 'email' ? 'default' : 'outline'}
                  onClick={() => setSearchType('email')}
                  className="flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={searchType === 'phone' ? 'default' : 'outline'}
                  onClick={() => setSearchType('phone')}
                  className="flex-1"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Phone
                </Button>
                <Button
                  type="button"
                  variant={searchType === 'name' ? 'default' : 'outline'}
                  onClick={() => setSearchType('name')}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  Your Name
                </Button>
              </div>

              {/* Search Input */}
              <div className="flex gap-3">
                <Input
                  type={searchType === 'email' ? 'email' : searchType === 'phone' ? 'tel' : 'text'}
                  placeholder={
                    searchType === 'email' ? 'your@email.com' :
                    searchType === 'phone' ? '(555) 123-4567' :
                    'John Doe'
                  }
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="flex-1"
                  required
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
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {pets.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Your Pet Reports ({pets.length})
            </h2>
            {pets.map((pet) => (
              <Link key={pet.id} href={`/petreunion/my-pet/${pet.id}`}>
                <Card className="hover:shadow-xl transition cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {pet.photo_url && (
                        <img
                          src={pet.photo_url}
                          alt={pet.pet_name || 'Pet'}
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {pet.pet_name || 'Unknown Name'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {pet.pet_type} • {pet.breed} • {pet.color}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="w-4 h-4" />
                          {pet.location_city}, {pet.location_state}
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">
                              {pet.search_stats?.totalSearches || 0} searches
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">
                              {pet.search_stats?.matchAttempts || 0} matches checked
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium">
                              Last search: {pet.search_stats?.lastSearchTime ? new Date(pet.search_stats.lastSearchTime).toLocaleDateString() : 'Never'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          pet.status === 'lost' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {pet.status === 'lost' ? 'Still Missing' : 'Found'}
                        </div>
                        <Button className="mt-4" variant="outline">
                          View Details →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <Link href="/petreunion" className="text-blue-600 hover:underline">
            ← Back to PetReunion
          </Link>
        </div>
      </div>
    </div>
  );
}

