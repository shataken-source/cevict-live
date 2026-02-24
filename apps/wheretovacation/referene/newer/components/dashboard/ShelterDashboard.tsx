'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building, 
  PlusCircle, 
  Users, 
  TrendingUp, 
  Calendar,
  Heart,
  Search,
  Bell,
  Activity,
  MapPin,
  Phone,
  Mail,
  Camera,
  Download,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Edit,
  Trash2,
  Eye,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ShelterDashboardProps {
  shelter?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    description?: string;
    website?: string;
    founded_year?: number;
    capacity?: number;
    current_occupancy?: number;
  };
}

interface ShelterPet {
  id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  size: string;
  age?: string;
  gender?: string;
  status: 'available' | 'adopted' | 'pending' | 'lost' | 'found';
  intake_date: string;
  adoption_date?: string;
  location_city: string;
  location_state: string;
  photo?: string;
  description?: string;
  special_needs?: string;
  medical_conditions?: string;
  adoption_fee?: number;
  is_spayed_neutered?: boolean;
  is_vaccinated?: boolean;
  microchip_id?: string;
  created_at: string;
  updated_at: string;
}

interface ShelterStats {
  total_pets: number;
  available_for_adoption: number;
  adopted_this_month: number;
  adopted_this_year: number;
  pending_adoptions: number;
  success_rate: number;
  average_length_of_stay: number;
  capacity_utilization: number;
  intake_this_month: number;
  intake_this_year: number;
}

interface AdoptionApplication {
  id: string;
  pet_id: string;
  pet_name: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  submitted_date: string;
  last_updated: string;
  notes?: string;
}

export default function ShelterDashboard({ shelter }: ShelterDashboardProps) {
  const [pets, setPets] = useState<ShelterPet[]>([]);
  const [stats, setStats] = useState<ShelterStats | null>(null);
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (shelter) {
      loadShelterData();
    }
  }, [shelter]);

  const loadShelterData = async () => {
    try {
      setLoading(true);
      
      // Load shelter pets
      const petsResponse = await fetch(`/api/petreunion/shelter/pets?shelter_id=${shelter?.id}`);
      if (petsResponse.ok) {
        const petsData = await petsResponse.json();
        setPets(petsData.pets || []);
      }

      // Load shelter stats
      const statsResponse = await fetch(`/api/petreunion/shelter/stats?shelter_id=${shelter?.id}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load adoption applications
      const appsResponse = await fetch(`/api/petreunion/shelter/applications?shelter_id=${shelter?.id}`);
      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        setApplications(appsData.applications || []);
      }
    } catch (error) {
      console.error('Error loading shelter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'adopted': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'found': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'adopted': return <Heart className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'lost': return <AlertCircle className="h-4 w-4" />;
      case 'found': return <Search className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPets = pets.filter(pet => {
    const matchesSearch = pet.pet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pet.breed?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pet.color?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pet.status === statusFilter;
    const matchesType = typeFilter === 'all' || pet.pet_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (!shelter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center p-8">
            <CardHeader>
              <Building className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <CardTitle>Shelter Dashboard</CardTitle>
              <CardDescription>
                Please sign in as a shelter to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/auth/signin">
                  Sign In as Shelter
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Heart className="h-8 w-8 text-red-500" />
                <span className="font-bold text-xl">PetReunion</span>
              </Link>
              <Badge variant="default">
                <Building className="h-3 w-3 mr-1" />
                {shelter.name}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* CalmCast Button */}
              <Button variant="outline" size="sm" asChild>
                <Link href="/calmcast">
                  <Activity className="h-4 w-4 mr-2" />
                  CalmCast
                </Link>
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
                {applications.filter(app => app.status === 'pending').length > 0 && (
                  <span className="ml-1 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </Button>

              {/* Shelter Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Building className="h-4 w-4 mr-2" />
                    {shelter.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/shelter/profile">Edit Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/shelter/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/signout">Sign Out</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {shelter.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your shelter pets, track adoptions, and monitor your impact
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_pets}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.intake_this_month} this month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.available_for_adoption}</div>
                <p className="text-xs text-muted-foreground">Ready for adoption</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Adopted This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.adopted_this_month}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.adopted_this_year} this year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.success_rate}%</div>
                <Progress value={stats.success_rate} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Button asChild className="h-16">
            <Link href="/petreunion/shelter/add-pet">
              <PlusCircle className="h-5 w-5 mr-2" />
              Add New Pet
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="h-16">
            <Link href="/petreunion/shelter/applications">
              <Users className="h-5 w-5 mr-2" />
              Applications
              {applications.filter(app => app.status === 'pending').length > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {applications.filter(app => app.status === 'pending').length}
                </Badge>
              )}
            </Link>
          </Button>

          <Button variant="outline" asChild className="h-16">
            <Link href="/petreunion/shelter/analytics">
              <BarChart3 className="h-5 w-5 mr-2" />
              Analytics
            </Link>
          </Button>

          <Button variant="outline" asChild className="h-16">
            <Link href="/petreunion/shelter/settings">
              <Edit className="h-5 w-5 mr-2" />
              Settings
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pets">Pets</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="pets" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search pets by name, breed, or color..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="adopted">Adopted</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="found">Found</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="dog">Dogs</SelectItem>
                      <SelectItem value="cat">Cats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Pets Grid */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Shelter Pets</CardTitle>
                    <CardDescription>
                      Manage all pets in your shelter
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/petreunion/shelter/manage">
                      Manage All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading pets...</div>
                ) : filteredPets.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pets found</h3>
                    <p className="text-gray-600 mb-4">
                      {pets.length === 0 ? 'Start by adding your first pet to the shelter' : 'Try adjusting your filters'}
                    </p>
                    {pets.length === 0 && (
                      <Button asChild>
                        <Link href="/petreunion/shelter/add-pet">
                          Add Pet
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPets.map((pet) => (
                      <Card key={pet.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={pet.photo} />
                              <AvatarFallback>
                                {pet.pet_type === 'dog' ? '🐕' : '🐈'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-medium text-gray-900 truncate">
                                  {pet.pet_name || 'Unnamed'}
                                </h3>
                                <Badge className={getStatusColor(pet.status)}>
                                  {getStatusIcon(pet.status)}
                                  <span className="ml-1">{pet.status}</span>
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center">
                                  <span className="capitalize">{pet.pet_type}</span>
                                  <span className="mx-1">•</span>
                                  <span>{pet.breed}</span>
                                  <span className="mx-1">•</span>
                                  <span>{pet.color}</span>
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>
                                    {pet.adoption_date 
                                      ? `Adopted: ${new Date(pet.adoption_date).toLocaleDateString()}`
                                      : `Intake: ${new Date(pet.intake_date).toLocaleDateString()}`
                                    }
                                  </span>
                                </div>
                                {pet.adoption_fee && (
                                  <div className="font-medium text-green-600">
                                    Fee: ${pet.adoption_fee}
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-3 flex space-x-2">
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/petreunion/shelter/pet/${pet.id}`}>
                                    View
                                  </Link>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/petreunion/shelter/pet/${pet.id}/edit`}>
                                    <Edit className="h-3 w-3" />
                                  </Link>
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/petreunion/pet/${pet.id}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Public View
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download Poster
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Adoption Applications</CardTitle>
                    <CardDescription>
                      Review and manage adoption applications
                    </CardDescription>
                  </div>
                  <Badge variant="destructive">
                    {applications.filter(app => app.status === 'pending').length} Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                    <p className="text-gray-600">
                      Adoption applications will appear here when people apply to adopt your pets.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <div key={application.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{application.applicant_name}</h4>
                            <p className="text-sm text-gray-600">
                              Applying for: {application.pet_name}
                            </p>
                          </div>
                          <Badge className={getApplicationStatusColor(application.status)}>
                            {application.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {application.applicant_email}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {application.applicant_phone}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(application.submitted_date).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            View Application
                          </Button>
                          {application.status === 'pending' && (
                            <>
                              <Button size="sm" variant="default">
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive">
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Adoption Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Chart placeholder - Adoption trends over time
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Population Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Chart placeholder - Pet types and status breakdown
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New pet added: Buddy</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Adoption approved: Luna to Sarah Johnson</p>
                      <p className="text-xs text-gray-500">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New application received for Max</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
