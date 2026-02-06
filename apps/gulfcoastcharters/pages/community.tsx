/**
 * Community Feed Page
 * 
 * Route: /community
 * Displays community feed with fishing reports, posts, and social features
 */

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import FishingReports from '../src/components/FishingReports';
import MessageBoard from '../src/components/MessageBoard';
import CommunityLeaderboard from '../src/components/CommunityLeaderboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Fish, MessageSquare, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('reports');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error: any) {
        // Don't block access - community is public
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout session={null}>
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Community</h1>
          <p className="text-gray-600">
            Connect with fellow anglers, share your catches, and stay updated with the latest fishing reports
          </p>
        </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Fish className="w-4 h-4" />
              Fishing Reports
            </TabsTrigger>
            <TabsTrigger value="discussions" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
            {user && (
              <TabsTrigger value="gamification" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                My Progress
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            <FishingReports />
          </TabsContent>

          <TabsContent value="discussions" className="space-y-4">
            <MessageBoard />
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <CommunityLeaderboard />
          </TabsContent>

          {user && (
            <TabsContent value="gamification" className="space-y-4">
              <GamificationDashboard userId={user.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}

// Add imports
import GamificationDashboard from '../src/components/gamification/GamificationDashboard';
