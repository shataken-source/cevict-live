/**
 * Viral Growth Dashboard Component
 * 
 * Admin analytics dashboard for social sharing
 * Tracks shares, viral coefficient, click rates, and platform performance
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TrendingUp, Share2, Users, MousePointerClick } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ViralGrowthDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalShares: 0,
    sharesByPlatform: {} as Record<string, number>,
    sharesByType: {} as Record<string, number>,
    dailyTrends: [] as Array<{ date: string; shares: number }>,
    viralCoefficient: 0,
    clickThroughRate: 0,
    newUserConversions: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get total shares
      const { data: allShares, error: sharesError } = await supabase
        .from('social_shares')
        .select('platform, share_type, created_at');

      if (sharesError) throw sharesError;

      // Calculate stats
      const totalShares = allShares?.length || 0;
      
      // Shares by platform
      const sharesByPlatform: Record<string, number> = {};
      allShares?.forEach(share => {
        sharesByPlatform[share.platform] = (sharesByPlatform[share.platform] || 0) + 1;
      });

      // Shares by type
      const sharesByType: Record<string, number> = {};
      allShares?.forEach(share => {
        sharesByType[share.share_type] = (sharesByType[share.share_type] || 0) + 1;
      });

      // Daily trends (last 30 days)
      const dailyTrends: Array<{ date: string; shares: number }> = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayShares = allShares?.filter(share => {
          const shareDate = new Date(share.created_at).toISOString().split('T')[0];
          return shareDate === dateStr;
        }).length || 0;

        dailyTrends.push({ date: dateStr, shares: dayShares });
      }

      // Viral coefficient (simplified: shares per user)
      const { data: uniqueUsers } = await supabase
        .from('social_shares')
        .select('user_id')
        .not('user_id', 'is', null);
      
      const uniqueUserCount = new Set(uniqueUsers?.map(s => s.user_id) || []).size;
      const viralCoefficient = uniqueUserCount > 0 ? totalShares / uniqueUserCount : 0;

      setStats({
        totalShares,
        sharesByPlatform,
        sharesByType,
        dailyTrends,
        viralCoefficient: Math.round(viralCoefficient * 100) / 100,
        clickThroughRate: 0, // Would need click tracking
        newUserConversions: 0, // Would need conversion tracking
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Viral Growth Dashboard
          </CardTitle>
          <CardDescription>
            Social sharing analytics and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="platforms">By Platform</TabsTrigger>
              <TabsTrigger value="types">By Type</TabsTrigger>
              <TabsTrigger value="trends">Daily Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-600">Total Shares</span>
                    </div>
                    <div className="text-3xl font-bold">{stats.totalShares}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-600">Viral Coefficient</span>
                    </div>
                    <div className="text-3xl font-bold">{stats.viralCoefficient}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MousePointerClick className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-gray-600">Click Rate</span>
                    </div>
                    <div className="text-3xl font-bold">{stats.clickThroughRate}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-gray-600">New Users</span>
                    </div>
                    <div className="text-3xl font-bold">{stats.newUserConversions}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="platforms">
              <div className="space-y-2">
                {Object.entries(stats.sharesByPlatform).map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium capitalize">{platform}</span>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="types">
              <div className="space-y-2">
                {Object.entries(stats.sharesByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium capitalize">{type}</span>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="trends">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.dailyTrends.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                    <span className="font-bold">{day.shares} shares</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
