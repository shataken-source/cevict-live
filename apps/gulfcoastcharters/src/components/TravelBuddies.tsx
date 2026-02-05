import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Users, MessageCircle, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Match {
  userId: string;
  email: string;
  sharedActivities: string[];
  matchScore: number;
}

interface TravelBuddiesProps {
  userId: string;
  userActivities: string[];
}

export default function TravelBuddies({ userId, userActivities }: TravelBuddiesProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const findMatches = async () => {
    if (userActivities.length === 0) {
      setMatches([]);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('activity-matcher', {
        body: { action: 'match', userId, activities: userActivities }
      });

      if (error) {
        console.error('Edge function error:', error);
        setError('Unable to find matches. Please try again later.');
        return;
      }

      if (data && data.success !== false) {
        setMatches(data.matches || []);
      } else {
        setError(data?.error || 'Unable to find matches');
      }
    } catch (err: any) {
      console.error('Error finding matches:', err);
      if (err.message?.includes('Failed to fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    findMatches();
  }, [userActivities]);


  if (userActivities.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <h3 className="font-semibold mb-2">Find Travel Buddies</h3>
        <p className="text-sm text-gray-600">
          Select your activity interests above to connect with travelers who share your passions
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Travel Buddies ({matches.length})
        </h3>
        <Button size="sm" onClick={findMatches} disabled={loading}>
          {loading ? 'Searching...' : 'Refresh Matches'}
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {!error && matches.length === 0 && !loading && (
        <Card className="p-6 text-center">
          <p className="text-gray-600">No matches found yet. Check back later!</p>
        </Card>
      )}

      {!error && matches.length > 0 && (
        <div className="space-y-3">
          {matches.map((match, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{match.email.split('@')[0]}</p>
                  <p className="text-xs text-gray-500 mb-2">{match.matchScore} shared interests</p>
                  <div className="flex flex-wrap gap-1">
                    {match.sharedActivities.map(activity => (
                      <Badge key={activity} variant="secondary" className="text-xs">
                        {activity}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
