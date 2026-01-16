'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  BarChart3, 
  Search, 
  TrendingUp, 
  MapPin, 
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Calendar,
  Users,
  Heart,
  Loader2
} from '@/components/ui/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

export default function AdminDashboard() {
  // Don't create Supabase client here - use API routes instead

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentPets, setRecentPets] = useState<any[]>([]);
  const [allPets, setAllPets] = useState<any[]>([]); // For browse tab
  const [stateBreakdown, setStateBreakdown] = useState<Record<string, number>>({});
  const [typeBreakdown, setTypeBreakdown] = useState<Record<string, number>>({});
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load stats from stats API
      const statsResponse = await fetch('/api/petreunion/stats');
      const statsData = await statsResponse.json();
      if (statsResponse.ok && statsData.table_exists) {
        setStats({
          totalPets: statsData.total_pets || 0,
          dogs: statsData.by_type?.dog || 0,
          cats: statsData.by_type?.cat || 0,
          foundPets: statsData.by_status?.found || 0,
          lostPets: statsData.by_status?.lost || 0,
        });
      }

      // Load verification data
      const verifyResponse = await fetch('/api/petreunion/verify-database');
      const verifyData = await verifyResponse.json();
      if (verifyData.success) {
        setStateBreakdown(verifyData.summary.stateBreakdown || {});
        setTypeBreakdown(verifyData.summary.typeBreakdown || {});
        setDataQuality(verifyData.summary.dataQuality || {});
        setRecentPets(verifyData.sampleRecords || []);
      }

      // Load all pets for browse tab
      const allPetsResponse = await fetch('/api/petreunion/export-data?format=json&status=all&type=all');
      const allPetsData = await allPetsResponse.json();
      if (allPetsResponse.ok && Array.isArray(allPetsData)) {
        setAllPets(allPetsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('format', format);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('pet_type', filterType);
      if (filterState !== 'all') params.append('location_state', filterState);
      
      const response = await fetch(`/api/petreunion/export-data?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Export failed');
      
      // Download the exported data
      const blob = new Blob([data.content], { type: data.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  // Filter pets for browse tab
  const filteredPets = allPets.filter(pet => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        pet.pet_name?.toLowerCase().includes(query) ||
        pet.breed?.toLowerCase().includes(query) ||
        pet.location_city?.toLowerCase().includes(query) ||
        pet.description?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus !== 'all' && pet.status !== filterStatus) {
      return false;
    }

    // Type filter
    if (filterType !== 'all' && pet.pet_type !== filterType) {
      return false;
    }

    // State filter
    if (filterState !== 'all' && pet.location_state !== filterState) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Database className="w-10 h-10 text-blue-600" />
              PetReunion Admin Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Comprehensive database management, analytics, and reporting
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={loadDashboardData} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => exportData('json')} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={() => exportData('csv')} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="browse">Browse Pets</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-blue-900">Total Pets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-blue-900">{stats?.totalPets || 0}</div>
                    <p className="text-xs text-blue-700 mt-1">All pets in database</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-900">Dogs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-purple-900">{stats?.dogs || 0}</div>
                    <p className="text-xs text-purple-700 mt-1">{stats?.totalPets ? Math.round((stats.dogs / stats.totalPets) * 100) : 0}% of total</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-pink-900">Cats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-pink-900">{stats?.cats || 0}</div>
                    <p className="text-xs text-pink-700 mt-1">{stats?.totalPets ? Math.round((stats.cats / stats.totalPets) * 100) : 0}% of total</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-900">Available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-green-900">{stats?.foundPets || 0}</div>
                    <p className="text-xs text-green-700 mt-1">Found/Available pets</p>
                  </CardContent>
                </Card>
              </div>

              {/* Data Quality */}
              {dataQuality && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Data Quality Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Photos</span>
                          <span className="text-sm text-gray-600">
                            {dataQuality.withPhotos} / {stats?.totalPets || 0}
                          </span>
                        </div>
                        <Progress value={dataQuality.photoPercentage} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{dataQuality.photoPercentage}% have photos</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Descriptions</span>
                          <span className="text-sm text-gray-600">
                            {dataQuality.withDescriptions} / {stats?.totalPets || 0}
                          </span>
                        </div>
                        <Progress value={dataQuality.descriptionPercentage} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{dataQuality.descriptionPercentage}% have descriptions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Pets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Recent Pets Added
                  </CardTitle>
                  <CardDescription>Latest pets added to the database</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentPets.slice(0, 10).map((pet) => (
                      <div key={pet.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        {pet.photo_url && (
                          <img src={pet.photo_url} alt={pet.pet_name} className="w-16 h-16 object-cover rounded flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{pet.pet_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-600 mb-1">
                            {pet.breed} • {pet.pet_type} • {pet.location_city}, {pet.location_state}
                          </div>
                          {pet.description && pet.description.trim() && (
                            <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                              {pet.description.length > 100 ? pet.description.substring(0, 100) + '...' : pet.description}
                            </div>
                          )}
                          {(!pet.description || !pet.description.trim()) && (
                            <div className="text-xs text-gray-400 italic mt-1">No description</div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500 mb-1">
                            {new Date(pet.created_at).toLocaleDateString()}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            pet.status === 'found' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {pet.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* State Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Pets by State
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {Object.entries(stateBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([state, count]) => (
                          <div key={state} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-medium">{state}</span>
                            <span className="text-blue-600 font-bold">{count as number}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Type Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Pets by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(typeBreakdown).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium capitalize">{type}</span>
                          <span className="text-purple-600 font-bold">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{stats?.foundPets || 0}</div>
                      <div className="text-sm text-green-700">Found/Available</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-900">{stats?.lostPets || 0}</div>
                      <div className="text-sm text-red-700">Lost</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Browse Tab */}
            <TabsContent value="browse" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Browse & Search Pets</CardTitle>
                  <CardDescription>Search and filter through all pets in the database</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search & Filters */}
                  <div className="flex gap-3">
                    <Input
                      placeholder="Search by name, breed, city, description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex h-10 w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="all">All Status</option>
                      <option value="found">Found</option>
                      <option value="lost">Lost</option>
                    </select>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="flex h-10 w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="all">All Types</option>
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                    </select>
                  </div>

                  {/* Results Count */}
                  <div className="text-sm text-gray-600 mb-4">
                    Showing {filteredPets.length} of {allPets.length} pets
                  </div>

                  {/* Results */}
                  {filteredPets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No pets found matching your filters.
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPets.map((pet) => (
                        <Link key={pet.id} href={`/petreunion/lost/${pet.id}`}>
                          <Card className="hover:shadow-lg transition cursor-pointer h-full">
                            {pet.photo_url && (
                              <div className="w-full h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                                <img src={pet.photo_url} alt={pet.pet_name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <CardHeader>
                              <CardTitle className="text-lg">{pet.pet_name || 'Unknown'}</CardTitle>
                              <CardDescription>
                                {pet.location_city}, {pet.location_state}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex gap-2 flex-wrap">
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{pet.pet_type}</span>
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">{pet.breed}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    pet.status === 'found' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {pet.status}
                                  </span>
                                </div>
                                {pet.description && (
                                  <p className="text-sm text-gray-600 line-clamp-2">{pet.description}</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Database Summary Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Pets:</span>
                        <strong>{stats?.totalPets || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Dogs:</span>
                        <strong>{stats?.dogs || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Cats:</span>
                        <strong>{stats?.cats || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <strong className="text-green-600">{stats?.foundPets || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Lost:</span>
                        <strong className="text-red-600">{stats?.lostPets || 0}</strong>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Growth Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Data Quality Score</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {dataQuality ? Math.round((dataQuality.photoPercentage + dataQuality.descriptionPercentage) / 2) : 0}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">With Photos</div>
                          <div className="text-xl font-bold">{dataQuality?.withPhotos || 0}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">With Descriptions</div>
                          <div className="text-xl font-bold">{dataQuality?.withDescriptions || 0}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Link href="/petreunion/report">
                      <Button className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white">
                        <Heart className="w-4 h-4 mr-2" />
                        ➕ Add Pet (Report Form)
                      </Button>
                    </Link>
                    <Link href="/petreunion/admin/populate">
                      <Button className="w-full" variant="outline">
                        <Database className="w-4 h-4 mr-2" />
                        Populate Database (Scrape)
                      </Button>
                    </Link>
                    <Link href="/search">
                      <Button className="w-full" variant="outline">
                        <Search className="w-4 h-4 mr-2" />
                        Public Search
                      </Button>
                    </Link>
                    <Link href="/api/petreunion/verify-database" target="_blank">
                      <Button className="w-full" variant="outline">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Verify Database
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Database Tools</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Link href="/petreunion/admin/setup">
                          <Button className="w-full" variant="outline">
                            <Database className="w-4 h-4 mr-2" />
                            Setup Database (Run Migrations)
                          </Button>
                        </Link>
                        <Link href="/petreunion/admin/populate">
                          <Button className="w-full" variant="outline">
                            <Database className="w-4 h-4 mr-2" />
                            Populate Database
                          </Button>
                        </Link>
                        <Link href="/petreunion/admin/resize-images">
                          <Button className="w-full" variant="outline">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Resize All Images
                          </Button>
                        </Link>
                        <Button className="w-full" variant="outline" onClick={() => exportData('json')}>
                          <Download className="w-4 h-4 mr-2" />
                          Export JSON
                        </Button>
                        <Button className="w-full" variant="outline" onClick={() => exportData('csv')}>
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      </CardContent>
                    </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Verification Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/api/petreunion/verify-database" target="_blank">
                      <Button className="w-full" variant="outline">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Verify Database
                      </Button>
                    </Link>
                    <Button className="w-full" variant="outline" onClick={loadDashboardData}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Stats
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

