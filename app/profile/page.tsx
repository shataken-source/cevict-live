'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useUnifiedAuth } from '@/shared/auth/UnifiedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  User,
  MapPin,
  Calendar,
  Trophy,
  Star,
  Eye,
  MessageSquare,
  ExternalLink,
  Edit,
  Settings,
  Award,
  Target,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  created_at: string;
}

interface UserStats {
  user_id: string;
  points: number;
  level: number;
  badges: string[];
  contributions_count: number;
  corrections_count: number;
  places_submitted: number;
  places_verified: number;
  last_active: string;
}

interface Contribution {
  id: string;
  type: 'place' | 'correction';
  title: string;
  description: string;
  status: string;
  created_at: string;
  points_awarded?: number;
  state_code: string;
  category?: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

export default function UserProfile() {
  const { user } = useUnifiedAuth();
  const supabase = createClient();
  const client = supabase as NonNullable<typeof supabase> | null;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserStats();
      loadContributions();
      loadBadges();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      if (!client) return;
      const { data, error } = await client
        .from('unified_users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      if (!client) return;
      const { data, error } = await client
        .from('unified_user_stats')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUserStats(data);
      } else {
        // Create default stats
        await createDefaultStats();
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const createDefaultStats = async () => {
    try {
      if (!supabase) {
        console.warn('Supabase not configured, skipping default stats creation');
        return;
      }
      const { data, error } = await supabase
        .from('unified_user_stats')
        .insert({
          user_id: user?.id,
          points: 0,
          level: 1,
          badges: [],
          contributions_count: 0,
          corrections_count: 0,
          places_submitted: 0,
          places_verified: 0
        })
        .select()
        .single();

      if (error) throw error;
      setUserStats(data);
    } catch (error) {
      console.error('Error creating default stats:', error);
    }
  };

  const loadContributions = async () => {
    try {
      if (!supabase) {
        console.warn('Supabase not configured, skipping contributions load');
        setContributions([]);
        return;
      }
      // Load places submitted by user
      const { data: places, error: placesError } = await supabase
        .from('sr_directory_places')
        .select('id, name, description, status, submitted_at, state_code, category')
        .eq('submitted_by', user?.id)
        .order('submitted_at', { ascending: false });

      if (placesError) throw placesError;

      // Load corrections submitted by user
      const { data: corrections, error: correctionsError } = await supabase
        .from('sr_corrections')
        .select('id, proposed_summary, status, created_at, points_awarded')
        .eq('submitted_by', user?.id)
        .order('created_at', { ascending: false });

      if (correctionsError) throw correctionsError;

      const allContributions: Contribution[] = [
        ...(places || []).map((place: any) => ({
          id: place.id,
          type: 'place' as const,
          title: place.name,
          description: place.description || 'No description',
          status: place.status,
          created_at: place.submitted_at,
          state_code: place.state_code,
          category: place.category
        })),
        ...(corrections || []).map((correction: any) => ({
          id: correction.id,
          type: 'correction' as const,
          title: 'Law Correction',
          description: correction.proposed_summary || 'Correction submitted',
          status: correction.status,
          created_at: correction.created_at,
          points_awarded: correction.points_awarded,
          state_code: correction.state_code || '',
        }))
      ];

      setContributions(allContributions.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error) {
      console.error('Error loading contributions:', error);
    }
  };

  const loadBadges = async () => {
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) {
        console.warn('Supabase not configured, badges unavailable');
        setBadges([]);
        return;
      }

      // Fetch badges from Supabase
      const { data, error } = await supabaseClient
        .from('user_badges')
        .select('*')
        .eq('user_id', userProfile?.id);

      if (error) {
        console.error('Error loading badges:', error);
        setBadges([]);
        return;
      }

      // Transform to Badge format
      const badges: Badge[] = (data || []).map((badge: any) => ({
        id: badge.badge_id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon || '🏆',
        earned_at: badge.earned_at
      }));

      setBadges(badges);
    } catch (error) {
      console.error('Error loading badges:', error);
      setBadges([]);
    }
  };

  const getLevelProgress = () => {
    if (!userStats) return 0;
    const pointsForNextLevel = userStats.level * 100;
    const pointsInCurrentLevel = userStats.points - ((userStats.level - 1) * 100);
    return Math.min(100, (pointsInCurrentLevel / 100) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'needs_more_info':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name[0]}${userProfile.last_name[0]}`;
    }
    return userProfile?.email?.[0]?.toUpperCase() || 'U';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Sign In Required</h2>
            <p className="text-slate-600 mb-4">Please sign in to view your profile</p>
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Profile Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold">
                    {userProfile?.first_name && userProfile?.last_name
                      ? `${userProfile.first_name} ${userProfile.last_name}`
                      : userProfile?.email
                    }
                  </h2>
                  <Badge variant="outline">Level {userStats?.level || 1}</Badge>
                </div>

                <p className="text-slate-600 mb-4">{userProfile?.email}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{userStats?.points || 0}</div>
                    <div className="text-sm text-slate-600">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{userStats?.contributions_count || 0}</div>
                    <div className="text-sm text-slate-600">Contributions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{userStats?.places_verified || 0}</div>
                    <div className="text-sm text-slate-600">Verified Places</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{badges.length}</div>
                    <div className="text-sm text-slate-600">Badges Earned</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Level Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Level {userStats?.level || 1} Progress</span>
                <span className="text-sm text-slate-600">
                  {userStats?.points || 0} / {(userStats?.level || 1) * 100} points
                </span>
              </div>
              <Progress value={getLevelProgress()} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="contributions">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Contributions Tab */}
          <TabsContent value="contributions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">My Contributions</h3>
              <Button asChild>
                <Link href="/submit-place">
                  <Edit className="w-4 h-4 mr-2" />
                  Add New
                </Link>
              </Button>
            </div>

            {contributions.length > 0 ? (
              <div className="space-y-4">
                {contributions.map((contribution) => (
                  <Card key={contribution.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={contribution.type === 'place' ? 'default' : 'secondary'}>
                              {contribution.type === 'place' ? 'Place' : 'Correction'}
                            </Badge>
                            <Badge className={getStatusColor(contribution.status)}>
                              {contribution.status.replace('_', ' ')}
                            </Badge>
                            {contribution.points_awarded && (
                              <Badge variant="outline" className="text-green-600">
                                +{contribution.points_awarded} pts
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-medium text-slate-900 mb-1">{contribution.title}</h4>
                          <p className="text-sm text-slate-600 mb-2">{contribution.description}</p>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(contribution.created_at).toLocaleDateString()}
                            </div>
                            {contribution.state_code && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {contribution.state_code}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No contributions yet</h3>
                  <p className="text-slate-600 mb-4">Start contributing to the community by submitting places or corrections</p>
                  <div className="flex gap-3 justify-center">
                    <Button asChild>
                      <Link href="/submit-place">Submit Place</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/submit-correction">Submit Correction</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            <h3 className="text-lg font-semibold">Badges Earned</h3>

            {badges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <Card key={badge.id}>
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-3">{badge.icon}</div>
                      <h4 className="font-semibold text-slate-900 mb-1">{badge.name}</h4>
                      <p className="text-sm text-slate-600 mb-2">{badge.description}</p>
                      <div className="text-xs text-slate-500">
                        Earned: {new Date(badge.earned_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Award className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No badges yet</h3>
                  <p className="text-slate-600">Earn badges by contributing to the community</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-4">
            <h3 className="text-lg font-semibold">Contribution Statistics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Submission Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Places Submitted</span>
                      <span className="font-medium">{userStats?.places_submitted || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Places Verified</span>
                      <span className="font-medium">{userStats?.places_verified || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Corrections Submitted</span>
                      <span className="font-medium">{userStats?.corrections_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Contributions</span>
                      <span className="font-medium">{userStats?.contributions_count || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Member Since</span>
                      <span className="font-medium">
                        {userProfile ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Active</span>
                      <span className="font-medium">
                        {userStats ? new Date(userStats.last_active).toLocaleDateString() : 'Today'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg. Points/Contribution</span>
                      <span className="font-medium">
                        {userStats && userStats.contributions_count > 0
                          ? (userStats.points / userStats.contributions_count).toFixed(1)
                          : '0'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="font-medium">
                        {contributions.length > 0
                          ? Math.round((contributions.filter(c => c.status === 'verified' || c.status === 'accepted').length / contributions.length) * 100)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Activity</h3>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-slate-600">Your recent contributions are helping keep SmokersRights accurate</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-600">Community members are viewing your submissions</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-slate-600">You're making a difference in civil liberties awareness</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Keep contributing!</h4>
                  </div>
                  <p className="text-sm text-blue-800">
                    Your contributions help thousands of people understand their rights. Every submission makes a difference.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
