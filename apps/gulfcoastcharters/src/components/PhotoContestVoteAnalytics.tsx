import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, Trophy, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface VoteAnalytics {
  totalVotes: number;
  photoCount: number;
  averageVotes: number;
  photoStats: Array<{
    photoId: string;
    photoUrl: string;
    userName: string;
    votes: number;
    voterCount: number;
    lastVoteTime: number | null;
  }>;
}

export default function PhotoContestVoteAnalytics({ eventId }: { eventId: string }) {
  const [analytics, setAnalytics] = useState<VoteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [eventId]);

  const loadAnalytics = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('photo-contest-manager', {
      body: { action: 'getAnalytics', eventId }
    });

    if (data) {
      setAnalytics(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <Card className="p-6"><div className="text-center">Loading analytics...</div></Card>;
  }

  if (!analytics) {
    return <Card className="p-6"><div className="text-center text-gray-500">No analytics available</div></Card>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold">Vote Analytics</h3>
        </div>
        <Button size="sm" variant="outline" onClick={loadAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Total Votes</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{analytics.totalVotes}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Photos</span>
          </div>
          <p className="text-3xl font-bold text-purple-900">{analytics.photoCount}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Avg Votes/Photo</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{analytics.averageVotes.toFixed(1)}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-3">Photo Performance</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {analytics.photoStats.map((stat, index) => (
            <div key={stat.photoId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg font-bold text-gray-500 w-8">#{index + 1}</span>
              <img src={stat.photoUrl} alt={stat.userName} className="w-12 h-12 object-cover rounded" />
              <div className="flex-1">
                <p className="font-medium">{stat.userName}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{stat.votes} votes</span>
                  <span>{stat.voterCount} voters</span>
                  {stat.lastVoteTime && (
                    <span className="text-xs">
                      Last: {new Date(stat.lastVoteTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(stat.votes / analytics.totalVotes) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
