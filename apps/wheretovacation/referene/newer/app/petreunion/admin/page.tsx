'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { 
  Search, 
  RefreshCw, 
  Play, 
  Database, 
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  Loader2,
  Home,
  Activity,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Pet {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string;
  color: string;
  size: string | null;
  status: 'lost' | 'found' | 'reunited';
  location_city: string;
  location_state: string;
  date_lost?: string;
  date_found?: string;
  photo_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Match {
  id: string;
  lost_pet_id: string;
  found_pet_id: string;
  match_score: number;
  match_reasons: string[];
  status: string;
  created_at: string;
}

function PetReunionAdminPageContent() {
  // State for Supabase client (initialized asynchronously)
  const [supabase, setSupabase] = useState<any>(null);

  const [pets, setPets] = useState<Pet[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [stats, setStats] = useState({
    totalPets: 0,
    lostPets: 0,
    foundPets: 0,
    reunitedPets: 0,
    totalMatches: 0
  });

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState('');

  // Initialize Supabase client only in browser
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('@supabase/supabase-js').then(({ createClient }) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (supabaseUrl && supabaseAnonKey) {
        setSupabase(createClient(supabaseUrl, supabaseAnonKey));
      }
    }).catch((error) => {
      console.error('Error loading Supabase:', error);
    });
  }, []);

  useEffect(() => {
    if (supabase) {
      loadData();
    }
  }, [supabase]);

  const loadData = async () => {
    if (!supabase) {
      toast.error('Database not configured');
      return;
    }

    setLoading(true);
    try {
      // Load pets and stats first (these tables should exist)
      await loadPets();
      await loadStats();
      // Load matches separately - it's okay if this fails (table might not exist)
      loadMatches().catch(() => {
        // Silently fail - matches table might not exist yet
      });
    } catch (error: any) {
      toast.error('Failed to load data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadPets = async () => {
    if (!supabase) return;

    let query = supabase
      .from('lost_pets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data, error } = await query;

    if (error) {
      console.error('Error loading pets:', error);
      toast.error('Failed to load pets');
      return;
    }

    setPets(data || []);
  };

  const loadMatches = async () => {
    if (!supabase) {
      setMatches([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pet_matches')
        .select('*')
        .order('match_score', { ascending: false })
        .limit(50);

      if (error) {
        // Table might not exist yet - that's okay, just set empty array
        if (error.code === '42P01' || 
            error.code === 'PGRST116' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('relation') ||
            Object.keys(error).length === 0) {
          // Table doesn't exist or is empty - this is fine
          setMatches([]);
          return;
        }
        // Only log actual errors, not missing table
        if (error.message && !error.message.includes('does not exist')) {
          console.error('Error loading matches:', error.message || error);
        }
        setMatches([]);
        return;
      }

      setMatches(data || []);
    } catch (err: any) {
      // Silently handle errors - table might not exist
      setMatches([]);
    }
  };

  const loadStats = async () => {
    if (!supabase) return;

    const { data: allPets, error } = await supabase
      .from('lost_pets')
      .select('status');

    if (error) {
      console.error('Error loading stats:', error);
      return;
    }

    const stats = {
      totalPets: allPets?.length || 0,
      lostPets: allPets?.filter(p => p.status === 'lost').length || 0,
      foundPets: allPets?.filter(p => p.status === 'found').length || 0,
      reunitedPets: allPets?.filter(p => p.status === 'reunited').length || 0,
      totalMatches: matches.length
    };

    setStats(stats);
  };

  const runMatching = async () => {
    setMatching(true);
    try {
      const response = await fetch('/api/petreunion/match-pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minScore: 60, saveMatches: true })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Found ${data.summary.totalMatches} matches!`);
        await loadMatches();
        await loadStats();
      } else {
        toast.error('Matching failed: ' + (data.message || data.error));
      }
    } catch (error: any) {
      toast.error('Matching error: ' + error.message);
    } finally {
      setMatching(false);
    }
  };

  const deletePet = async (petId: string) => {
    if (!confirm('Are you sure you want to delete this pet?')) return;

    if (!supabase) return;

    const { error } = await supabase
      .from('lost_pets')
      .delete()
      .eq('id', petId);

    if (error) {
      toast.error('Failed to delete pet: ' + error.message);
    } else {
      toast.success('Pet deleted successfully');
      loadData();
    }
  };

  const updatePetStatus = async (petId: string, newStatus: 'lost' | 'found' | 'reunited') => {
    if (!supabase) return;

    const { error } = await supabase
      .from('lost_pets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', petId);

    if (error) {
      toast.error('Failed to update status: ' + error.message);
    } else {
      toast.success('Status updated');
      loadData();
    }
  };

  // Filter pets
  const filteredPets = pets.filter(pet => {
    const matchesSearch = !searchTerm || 
      pet.pet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.location_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || pet.status === statusFilter;
    const matchesType = typeFilter === 'all' || pet.pet_type === typeFilter;
    const matchesLocation = !locationFilter || 
      pet.location_city?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      pet.location_state?.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              <Database className="inline-block w-10 h-10 mr-2 text-blue-600" />
              PetReunion Admin Panel
            </h1>
            <p className="text-gray-600">Manage pets, run matching, and view database</p>
          </div>
          <Link href="/petreunion">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pets</CardDescription>
              <CardTitle className="text-3xl">{stats.totalPets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Lost</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{stats.lostPets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Found</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.foundPets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reunited</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.reunitedPets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Matches</CardDescription>
              <CardTitle className="text-3xl text-purple-600">{stats.totalMatches}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Run matching, refresh data, and manage system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button 
                onClick={runMatching} 
                disabled={matching}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {matching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run Pet Matching
              </Button>
              <Button onClick={loadData} disabled={loading} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button 
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/petreunion/scrape-autonomous', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        sources: ['shelters'], 
                        location: 'Alabama',
                        maxPetsPerSource: 20 
                      })
                    });
                    const data = await response.json();
                    if (response.ok) {
                      toast.success(`Scraper found ${data.summary.totalFound} pets!`);
                      loadData();
                    } else {
                      toast.error('Scraper failed: ' + (data.message || data.error));
                    }
                  } catch (error: any) {
                    toast.error('Scraper error: ' + error.message);
                  }
                }}
              >
                <Activity className="w-4 h-4 mr-2" />
                Run Scraper
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Search & Filter Pets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search pets, breeds, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:col-span-2"
              />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">All Status</option>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
                <option value="reunited">Reunited</option>
              </select>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">All Types</option>
                <option value="dog">Dogs</option>
                <option value="cat">Cats</option>
              </select>
            </div>
            <div className="mt-4">
              <Input
                placeholder="Filter by location (city or state)..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pets List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pets Database ({filteredPets.length} {filteredPets.length === 1 ? 'pet' : 'pets'})
            </CardTitle>
            <CardDescription>Browse and manage all pets in the database</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredPets.length === 0 ? (
              <Alert>
                <AlertDescription>No pets found matching your filters.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {filteredPets.map((pet) => (
                  <div
                    key={pet.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {pet.photo_url && (
                        <img
                          src={pet.photo_url}
                          alt={pet.pet_name || 'Pet'}
                          className="w-24 h-24 object-cover rounded border"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {pet.pet_name || 'Unnamed Pet'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {pet.breed} • {pet.color} • {pet.size || 'Unknown size'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              📍 {pet.location_city}, {pet.location_state}
                            </p>
                            {pet.description && (
                              <p className="text-sm text-gray-600 mt-2">{pet.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Badge
                              variant={
                                pet.status === 'lost' ? 'destructive' :
                                pet.status === 'found' ? 'default' :
                                'success'
                              }
                            >
                              {pet.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Link href={`/petreunion/lost/${pet.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          {pet.status === 'lost' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePetStatus(pet.id, 'found')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Found
                            </Button>
                          )}
                          {pet.status === 'found' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePetStatus(pet.id, 'reunited')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Reunited
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deletePet(pet.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matches List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches ({matches.length})</CardTitle>
            <CardDescription>Potential matches between lost and found pets</CardDescription>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <Alert>
                <AlertDescription>No matches found. Run matching to find potential matches.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {matches.slice(0, 10).map((match) => (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          Match Score: <Badge>{match.match_score}%</Badge>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Lost Pet ID: {match.lost_pet_id} ↔ Found Pet ID: {match.found_pet_id}
                        </p>
                        {match.match_reasons && match.match_reasons.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reasons: {match.match_reasons.join(', ')}
                          </p>
                        )}
                      </div>
                      <Badge variant={match.status === 'pending' ? 'default' : 'success'}>
                        {match.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PetReunionAdminPage() {
  return (
    <ErrorBoundary>
      <PetReunionAdminPageContent />
    </ErrorBoundary>
  );
}

