'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Bell, 
  Heart, 
  MapPin, 
  Search, 
  Shield,
  Users,
  Activity,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Camera,
  Phone,
  Mail,
  Waves,
  Home,
  Cat,
  User,
  Building,
  PlusCircle,
  TrendingUp,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface Pet {
  id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  status: 'lost' | 'found' | 'reunited';
  date_lost?: string;
  date_found?: string;
  location_city: string;
  location_state: string;
  photo?: string;
  description?: string;
  created_at: string;
}

interface UserStats {
  total_pets: number;
  active_searches: number;
  reunions: number;
  views: number;
  alerts_received: number;
}

interface ShelterStats {
  total_pets: number;
  available_for_adoption: number;
  adopted_this_month: number;
  success_rate: number;
  active_searches: number;
}

interface UserDashboardProps {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: 'user' | 'shelter' | 'admin';
    shelter_id?: string;
  };
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [stats, setStats] = useState<UserStats | ShelterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user's pets
      if (user?.role === 'shelter') {
        // Load shelter pets
        const petsResponse = await fetch(`/api/petreunion/shelter/pets?shelter_id=${user.shelter_id}`);
        if (petsResponse.ok) {
          const petsData = await petsResponse.json();
          setUserPets(petsData.pets || []);
        }

        // Load shelter stats
        const statsResponse = await fetch(`/api/petreunion/shelter/stats?shelter_id=${user.shelter_id}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } else {
        // Load regular user pets
        const petsResponse = await fetch(`/api/petreunion/user/pets?user_id=${user?.id}`);
        if (petsResponse.ok) {
          const petsData = await petsResponse.json();
          setUserPets(petsData.pets || []);
        }

        // Load user stats
        const statsResponse = await fetch(`/api/petreunion/user/stats?user_id=${user?.id}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lost': return 'bg-red-100 text-red-800';
      case 'found': return 'bg-blue-100 text-blue-800';
      case 'reunited': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lost': return <AlertCircle className="h-4 w-4" />;
      case 'found': return <Search className="h-4 w-4" />;
      case 'reunited': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center p-8">
            <CardHeader>
              <User className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <CardTitle>Welcome to PetReunion</CardTitle>
              <CardDescription>
                Please sign in to access your personalized dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button asChild className="w-full">
                  <Link href="/auth/signin">
                    Sign In
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/auth/signup">
                    Create Account
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isShelter = user.role === 'shelter';
  const userStats = stats as UserStats;
  const shelterStats = stats as ShelterStats;

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
              <Badge variant={isShelter ? "default" : "secondary"}>
                {isShelter ? <Building className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                {isShelter ? 'Shelter' : 'User'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* CalmCast Button */}
              <Button variant="outline" size="sm" asChild>
                <Link href="/calmcast">
                  <Waves className="h-4 w-4 mr-2" />
                  CalmCast
                </Link>
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} />
                  <AvatarFallback>
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.name || user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-2">
            {isShelter 
              ? 'Manage your shelter pets and track adoption progress'
              : 'Track your lost pets and search for found pets in your area'
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isShelter ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
                  <Cat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shelterStats?.total_pets || 0}</div>
                  <p className="text-xs text-muted-foreground">In your care</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shelterStats?.available_for_adoption || 0}</div>
                  <p className="text-xs text-muted-foreground">Ready for adoption</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Adopted This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shelterStats?.adopted_this_month || 0}</div>
                  <p className="text-xs text-muted-foreground">Happy endings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shelterStats?.success_rate || 0}%</div>
                  <Progress value={shelterStats?.success_rate || 0} className="mt-2" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Pets</CardTitle>
                  <Cat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.total_pets || 0}</div>
                  <p className="text-xs text-muted-foreground">Total submitted</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Searches</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.active_searches || 0}</div>
                  <p className="text-xs text-muted-foreground">Currently looking for</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reunions</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.reunions || 0}</div>
                  <p className="text-xs text-muted-foreground">Successfully reunited</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.views || 0}</div>
                  <p className="text-xs text-muted-foreground">Total views</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {isShelter ? (
            <>
              <Button asChild className="h-16">
                <Link href="/petreunion/shelter/add-pet">
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Add New Pet
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-16">
                <Link href="/petreunion/shelter/manage">
                  <Users className="h-5 w-5 mr-2" />
                  Manage Pets
                </Link>
              </Button>

              <Button variant="outline" asChild className="h-16">
                <Link href="/petreunion/shelter/analytics">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  View Analytics
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild className="h-16">
                <Link href="/petreunion/report-lost">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Report Lost Pet
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-16">
                <Link href="/petreunion/report-found">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Report Found Pet
                </Link>
              </Button>

              <Button variant="outline" asChild className="h-16">
                <Link href="/petreunion/search">
                  <Search className="h-5 w-5 mr-2" />
                  Search Pets
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* My Pets Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                  <Cat className="h-5 w-5 mr-2" />
                  {isShelter ? 'Shelter Pets' : 'My Pets'}
                </CardTitle>
                <CardDescription>
                  {isShelter 
                    ? 'Manage pets in your shelter'
                    : 'Track the status of your submitted pets'
                  }
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={isShelter ? "/petreunion/shelter/manage" : "/petreunion/my-pets"}>
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : userPets.length === 0 ? (
              <div className="text-center py-8">
                <Cat className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pets yet</h3>
                <p className="text-gray-600 mb-4">
                  {isShelter 
                    ? 'Start by adding your first pet to the shelter'
                    : 'Report your first lost or found pet to get started'
                  }
                </p>
                <Button asChild>
                  <Link href={isShelter ? "/petreunion/shelter/add-pet" : "/petreunion/report-lost"}>
                    {isShelter ? 'Add Pet' : 'Report Pet'}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPets.slice(0, 6).map((pet) => (
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
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{pet.location_city}, {pet.location_state}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>
                                {pet.date_lost ? `Lost: ${new Date(pet.date_lost).toLocaleDateString()}` :
                                 pet.date_found ? `Found: ${new Date(pet.date_found).toLocaleDateString()}` :
                                 `Added: ${new Date(pet.created_at).toLocaleDateString()}`}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/petreunion/pet/${pet.id}`}>
                                View Details
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/petreunion/track/${pet.id}`}>
                                <Activity className="h-3 w-3 mr-1" />
                                Track
                              </Link>
                            </Button>
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

        {/* Recent Activity */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New match found for Max</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Profile viewed 5 times</p>
                    <p className="text-xs text-gray-500">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Alert sent to 3 nearby users</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Alerts & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-blue-900">New potential match</p>
                    <p className="text-xs text-blue-700">A found pet matches your lost pet description</p>
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-900">Search area expanded</p>
                    <p className="text-xs text-green-700">Your search is now visible to 10,000 more users</p>
                  </div>
                  <Button size="sm" variant="outline">Details</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
