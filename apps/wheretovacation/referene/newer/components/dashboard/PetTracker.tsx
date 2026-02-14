'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Calendar, 
  Eye, 
  Share2, 
  Bell, 
  CheckCircle,
  AlertCircle,
  Search,
  Heart,
  MessageCircle,
  Download,
  Camera,
  Phone,
  Mail,
  Activity,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface PetTrackerProps {
  petId: string;
  userId?: string;
}

interface Pet {
  id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  size: string;
  age?: string;
  gender?: string;
  status: 'lost' | 'found' | 'reunited';
  date_lost?: string;
  date_found?: string;
  location_city: string;
  location_state: string;
  location_zip?: string;
  location_detail?: string;
  description?: string;
  photo?: string;
  microchip?: string;
  collar?: string;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  reward_amount?: number;
  special_needs?: string;
  medical_conditions?: string;
  created_at: string;
  updated_at: string;
}

interface TrackingData {
  views: number;
  shares: number;
  alerts_sent: number;
  matches_found: number;
  last_viewed: string;
  search_radius: number;
  people_notified: number;
}

interface Activity {
  id: string;
  type: 'view' | 'share' | 'match' | 'alert' | 'update';
  message: string;
  timestamp: string;
  details?: any;
}

interface Match {
  id: string;
  pet_id: string;
  matched_pet_id: string;
  confidence_score: number;
  match_details: {
    breed_match: boolean;
    color_match: boolean;
    location_match: boolean;
    time_match: boolean;
  };
  created_at: string;
  viewed: boolean;
}

export default function PetTracker({ petId, userId }: PetTrackerProps) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPetData();
    loadTrackingData();
    loadActivities();
    loadMatches();
  }, [petId]);

  const loadPetData = async () => {
    try {
      const response = await fetch(`/api/petreunion/pet/${petId}`);
      if (response.ok) {
        const data = await response.json();
        setPet(data.pet);
      }
    } catch (error) {
      console.error('Error loading pet data:', error);
    }
  };

  const loadTrackingData = async () => {
    try {
      const response = await fetch(`/api/petreunion/pet/${petId}/tracking`);
      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await fetch(`/api/petreunion/pet/${petId}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const loadMatches = async () => {
    try {
      const response = await fetch(`/api/petreunion/pet/${petId}/matches`);
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/petreunion/pet/${petId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Help find ${pet?.pet_name || 'this pet'}`,
          text: `I'm looking for ${pet?.pet_name || 'this pet'}, ${pet?.breed} ${pet?.color} ${pet?.pet_type} in ${pet?.location_city}, ${pet?.location_state}. Please help spread the word!`,
          url: shareUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      }

      // Track share
      await fetch(`/api/petreunion/pet/${petId}/share`, { method: 'POST' });
      loadTrackingData();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownloadPoster = async () => {
    try {
      const response = await fetch(`/api/petreunion/pet/${petId}/poster`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pet?.pet_name || 'pet'}-poster.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading poster:', error);
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'view': return <Eye className="h-4 w-4" />;
      case 'share': return <Share2 className="h-4 w-4" />;
      case 'match': return <Heart className="h-4 w-4" />;
      case 'alert': return <Bell className="h-4 w-4" />;
      case 'update': return <Activity className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pet tracking data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="text-center p-8">
            <CardHeader>
              <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <CardTitle>Pet Not Found</CardTitle>
              <CardDescription>
                The pet you're looking for doesn't exist or you don't have permission to view it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">
                  Back to Dashboard
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ArrowRight className="h-4 w-4 rotate-180" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPoster}>
                <Download className="h-4 w-4 mr-2" />
                Download Poster
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pet Overview */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Pet Photo */}
              <div className="flex-shrink-0">
                <Avatar className="h-32 w-32 md:h-40 md:w-40">
                  <AvatarImage src={pet.photo} className="object-cover" />
                  <AvatarFallback className="text-4xl">
                    {pet.pet_type === 'dog' ? '🐕' : '🐈'}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Pet Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {pet.pet_name || 'Unnamed Pet'}
                    </h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="capitalize">{pet.pet_type}</span>
                      <span>•</span>
                      <span>{pet.breed}</span>
                      <span>•</span>
                      <span>{pet.color}</span>
                      <span>•</span>
                      <span>{pet.size}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(pet.status)}>
                    {pet.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{pet.location_city}, {pet.location_state} {pet.location_zip}</span>
                    </div>
                    {pet.date_lost && (
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Lost: {new Date(pet.date_lost).toLocaleDateString()}</span>
                      </div>
                    )}
                    {pet.date_found && (
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Found: {new Date(pet.date_found).toLocaleDateString()}</span>
                      </div>
                    )}
                    {pet.owner_phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{pet.owner_phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {pet.microchip && (
                      <div className="text-sm">
                        <span className="font-medium">Microchip:</span> {pet.microchip}
                      </div>
                    )}
                    {pet.collar && (
                      <div className="text-sm">
                        <span className="font-medium">Collar:</span> {pet.collar}
                      </div>
                    )}
                    {pet.reward_amount && (
                      <div className="text-sm font-medium text-green-600">
                        Reward: ${pet.reward_amount}
                      </div>
                    )}
                  </div>
                </div>

                {pet.description && (
                  <p className="text-gray-600 mb-4">{pet.description}</p>
                )}

                {pet.special_needs && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-yellow-800">Special Needs:</p>
                    <p className="text-sm text-yellow-700">{pet.special_needs}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking Stats */}
        {trackingData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Eye className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold">{trackingData.views}</div>
                <p className="text-sm text-gray-600">Profile Views</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Share2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <div className="text-2xl font-bold">{trackingData.shares}</div>
                <p className="text-sm text-gray-600">Shares</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Bell className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                <div className="text-2xl font-bold">{trackingData.alerts_sent}</div>
                <p className="text-sm text-gray-600">Alerts Sent</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="h-8 w-8 mx-auto text-red-600 mb-2" />
                <div className="text-2xl font-bold">{trackingData.matches_found}</div>
                <p className="text-sm text-gray-600">Potential Matches</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Search Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Search Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Search Radius</span>
                      <span>{trackingData?.search_radius || 0} miles</span>
                    </div>
                    <Progress value={Math.min((trackingData?.search_radius || 0) / 50 * 100, 100)} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>People Notified</span>
                      <span>{trackingData?.people_notified || 0}</span>
                    </div>
                    <Progress value={Math.min((trackingData?.people_notified || 0) / 1000 * 100, 100)} />
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">
                      Your search is automatically expanding to reach more people in the area.
                    </p>
                    <Button variant="outline" size="sm">
                      <Bell className="h-4 w-4 mr-2" />
                      Send Manual Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share on Social Media
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" onClick={handleDownloadPoster}>
                    <Download className="h-4 w-4 mr-2" />
                    Download "Lost Pet" Poster
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Share with Local Groups
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="matches" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Potential Matches
                </CardTitle>
                <CardDescription>
                  Pets that might match your lost pet based on description and location
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h3>
                    <p className="text-gray-600">
                      We're actively searching for matches. New matches will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {Math.round(match.confidence_score * 100)}% Match
                            </Badge>
                            {!match.viewed && (
                              <Badge variant="default">New</Badge>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div className={`flex items-center ${match.match_details.breed_match ? 'text-green-600' : 'text-gray-400'}`}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Breed Match
                          </div>
                          <div className={`flex items-center ${match.match_details.color_match ? 'text-green-600' : 'text-gray-400'}`}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Color Match
                          </div>
                          <div className={`flex items-center ${match.match_details.location_match ? 'text-green-600' : 'text-gray-400'}`}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Location Match
                          </div>
                          <div className={`flex items-center ${match.match_details.time_match ? 'text-green-600' : 'text-gray-400'}`}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Time Match
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                    <p className="text-gray-600">
                      Activity will appear here as people view and interact with this pet listing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Update Pet Information</CardTitle>
                  <CardDescription>
                    Keep your pet's information up to date for better matches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start">
                      <Camera className="h-4 w-4 mr-2" />
                      Add New Photos
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MapPin className="h-4 w-4 mr-2" />
                      Update Location
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manage Search</CardTitle>
                  <CardDescription>
                    Control how your pet's search is conducted
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start">
                      <Bell className="h-4 w-4 mr-2" />
                      Expand Search Area
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Share with More People
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Found
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
