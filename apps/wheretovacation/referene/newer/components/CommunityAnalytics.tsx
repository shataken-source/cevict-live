'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  Eye,
  Calendar,
  Clock,
  Target,
  Award,
  Activity,
  Filter,
  Download,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Bell,
  Zap,
  Trophy,
  Camera,
  Star,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';

interface AnalyticsData {
  totalMembers: number;
  activeUsers: number;
  postsToday: number;
  engagementRate: number;
  topContributors: Contributor[];
  contentPerformance: ContentMetric[];
  growthMetrics: GrowthMetric[];
  leaderboardActivity: LeaderboardMetric[];
}

interface Contributor {
  id: string;
  name: string;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  points: number;
  rank: number;
}

interface ContentMetric {
  type: string;
  count: number;
  engagement: number;
  growth: number;
}

interface GrowthMetric {
  date: string;
  members: number;
  posts: number;
  engagement: number;
}

interface LeaderboardMetric {
  category: string;
  participants: number;
  entries: number;
  activity: number;
}

export default function CommunityAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'overview' | 'engagement' | 'growth' | 'leaderboard'>('overview');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalMembers: 1247,
    activeUsers: 89,
    postsToday: 23,
    engagementRate: 68.5,
    topContributors: [
      { id: '1', name: 'The Miller Family', posts: 45, likes: 234, comments: 89, shares: 45, points: 1250, rank: 1 },
      { id: '2', name: 'Sarah Johnson', posts: 38, likes: 189, comments: 67, shares: 32, points: 980, rank: 2 },
      { id: '3', name: 'Mike Thompson', posts: 32, likes: 156, comments: 54, shares: 28, points: 850, rank: 3 }
    ],
    contentPerformance: [
      { type: 'Photos', count: 423, engagement: 72.5, growth: 15.3 },
      { type: 'Catch Reports', count: 156, engagement: 68.2, growth: 12.7 },
      { type: 'Reviews', count: 89, engagement: 45.8, growth: 8.9 },
      { type: 'Comments', count: 234, engagement: 58.3, growth: 10.2 }
    ],
    growthMetrics: [
      { date: '2024-11-01', members: 1100, posts: 120, engagement: 65.2 },
      { date: '2024-11-08', members: 1150, posts: 135, engagement: 66.8 },
      { date: '2024-11-15', members: 1200, posts: 148, engagement: 67.5 },
      { date: '2024-11-22', members: 1247, posts: 156, engagement: 68.5 }
    ],
    leaderboardActivity: [
      { category: 'Biggest Snapper', participants: 67, entries: 234, activity: 85.2 },
      { category: 'Most Fish', participants: 45, entries: 156, activity: 78.9 },
      { category: 'First Catch', participants: 89, entries: 145, activity: 92.3 }
    ]
  });

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setAnalyticsData(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 5),
        postsToday: prev.postsToday + Math.floor(Math.random() * 2),
        engagementRate: Math.min(100, prev.engagementRate + (Math.random() * 2 - 1))
      }));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color, 
    trend 
  }: { 
    title: string; 
    value: string; 
    change?: string; 
    icon: any; 
    color: string; 
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' && <ArrowUp className="w-4 h-4" />}
            {trend === 'down' && <ArrowDown className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );

  const TabButton = ({ id, label, count }: { 
    id: string; 
    label: string; 
    count?: string; 
  }) => (
    <button
      onClick={() => setSelectedMetric(id as any)}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        selectedMetric === id
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
      {count && <span className="ml-2 text-sm opacity-75">({count})</span>}
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Community Analytics</h2>
            <p className="text-gray-600">Track engagement and growth across your community</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Metric Tabs */}
        <div className="flex gap-2">
          <TabButton id="overview" label="Overview" />
          <TabButton id="engagement" label="Engagement" />
          <TabButton id="growth" label="Growth" />
          <TabButton id="leaderboard" label="Leaderboard" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {selectedMetric === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Members"
                value={analyticsData.totalMembers.toLocaleString()}
                change="+12.5%"
                icon={Users}
                color="bg-blue-500"
                trend="up"
              />
              <MetricCard
                title="Active Users"
                value={analyticsData.activeUsers.toString()}
                change="+8.3%"
                icon={Activity}
                color="bg-green-500"
                trend="up"
              />
              <MetricCard
                title="Posts Today"
                value={analyticsData.postsToday.toString()}
                change="+15.2%"
                icon={MessageSquare}
                color="bg-purple-500"
                trend="up"
              />
              <MetricCard
                title="Engagement Rate"
                value={`${analyticsData.engagementRate}%`}
                change="+2.1%"
                icon={Heart}
                color="bg-red-500"
                trend="up"
              />
            </div>

            {/* Content Performance */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Content Performance</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {analyticsData.contentPerformance.map((metric) => (
                  <div key={metric.type} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{metric.type}</span>
                      <span className="text-sm text-green-600 font-medium">+{metric.growth}%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{metric.count}</div>
                    <div className="text-sm text-gray-600">{metric.engagement}% engagement</div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${metric.engagement}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Contributors */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Contributors</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Rank</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Posts</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Likes</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Comments</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topContributors.map((contributor) => (
                      <tr key={contributor.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {contributor.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                            {contributor.rank === 2 && <Award className="w-5 h-5 text-gray-400" />}
                            {contributor.rank === 3 && <Award className="w-5 h-5 text-orange-600" />}
                            <span className="font-medium">#{contributor.rank}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{contributor.name}</td>
                        <td className="py-3 px-4">{contributor.posts}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4 text-gray-400" />
                            {contributor.likes}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4 text-gray-400" />
                            {contributor.comments}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-blue-600">{contributor.points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Engagement Tab */}
        {selectedMetric === 'engagement' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <MetricCard
                title="Avg. Time on Page"
                value="4m 32s"
                change="+18s"
                icon={Clock}
                color="bg-blue-500"
                trend="up"
              />
              <MetricCard
                title="Pages per Session"
                value="6.8"
                change="+0.5"
                icon={BarChart3}
                color="bg-green-500"
                trend="up"
              />
              <MetricCard
                title="Return Visitors"
                value="45.2%"
                change="+3.1%"
                icon={Users}
                color="bg-purple-500"
                trend="up"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Engagement Trends</h3>
              <div className="h-64 bg-white rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                  <p>Engagement chart would appear here</p>
                  <p className="text-sm">Showing daily engagement metrics</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Growth Tab */}
        {selectedMetric === 'growth' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <MetricCard
                title="New Members"
                value="147"
                change="+23"
                icon={TrendingUp}
                color="bg-blue-500"
                trend="up"
              />
              <MetricCard
                title="Member Retention"
                value="87.3%"
                change="+2.4%"
                icon={Target}
                color="bg-green-500"
                trend="up"
              />
              <MetricCard
                title="Growth Rate"
                value="12.5%"
                change="+1.8%"
                icon={Zap}
                color="bg-purple-500"
                trend="up"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Growth Over Time</h3>
              <div className="h-64 bg-white rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                  <p>Growth chart would appear here</p>
                  <p className="text-sm">Member growth and engagement trends</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {selectedMetric === 'leaderboard' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <MetricCard
                title="Active Competitors"
                value="89"
                change="+12"
                icon={Trophy}
                color="bg-yellow-500"
                trend="up"
              />
              <MetricCard
                title="Total Entries"
                value="234"
                change="+34"
                icon={Camera}
                color="bg-blue-500"
                trend="up"
              />
              <MetricCard
                title="Participation Rate"
                value="68.2%"
                change="+5.3%"
                icon={Star}
                color="bg-green-500"
                trend="up"
              />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Leaderboard Activity</h3>
              <div className="space-y-4">
                {analyticsData.leaderboardActivity.map((category) => (
                  <div key={category.category} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{category.category}</span>
                      <span className="text-sm text-green-600 font-medium">{category.activity}% active</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Participants:</span>
                        <span className="ml-2 font-medium">{category.participants}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Entries:</span>
                        <span className="ml-2 font-medium">{category.entries}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Activity:</span>
                        <span className="ml-2 font-medium">{category.activity}%</span>
                      </div>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${category.activity}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
