import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, ThumbsUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface LeaderboardEntry {
  id: string;
  photoUrl: string;
  userName: string;
  votes: number;
  rank: number;
  userId: string;
}

export default function PhotoContestLeaderboard({ eventId }: { eventId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [contest, setContest] = useState<any>(null);
  const [votedPhotos, setVotedPhotos] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState<string | null>(null);
  const { toast } = useToast();
  const currentUserId = localStorage.getItem('userId') || 'guest';

  useEffect(() => {
    const stored = localStorage.getItem(`contest_${eventId}`);
    if (stored) {
      setContest(JSON.parse(stored));
      loadLeaderboard();
    }
  }, [eventId]);

  const loadLeaderboard = async () => {
    const { data } = await supabase.functions.invoke('photo-contest-manager', {
      body: { action: 'getLeaderboard', eventId }
    });

    if (data?.leaderboard) {
      const ranked = data.leaderboard.map((photo: any, index: number) => ({
        ...photo,
        rank: index + 1
      }));
      setLeaderboard(ranked.slice(0, 10));
      
      // Check which photos user has voted for
      const voted = new Set<string>();
      ranked.forEach((photo: any) => {
        if (localStorage.getItem(`vote_${currentUserId}_${photo.id}`)) {
          voted.add(photo.id);
        }
      });
      setVotedPhotos(voted);
    }
  };

  const handleVote = async (photoId: string) => {
    if (votedPhotos.has(photoId)) {
      toast({ title: 'Already voted', description: 'You already voted for this photo' });
      return;
    }

    setVoting(photoId);
    const { data, error } = await supabase.functions.invoke('photo-contest-manager', {
      body: { action: 'vote', photoId, userId: currentUserId, eventId }
    });

    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || 'Failed to vote', variant: 'destructive' });
    } else {
      toast({ title: 'Vote recorded!', description: 'Your vote has been counted' });
      setVotedPhotos(prev => new Set(prev).add(photoId));
      loadLeaderboard();
    }
    setVoting(null);
  };

  if (!contest) return null;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
  };

  const canVote = contest.status === 'voting';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h3 className="text-xl font-bold">Contest Leaderboard</h3>
        </div>
        {canVote && <span className="text-sm text-green-600 font-medium">Voting Open</span>}
      </div>

      <div className="space-y-3">
        {leaderboard.map((entry) => (
          <div key={entry.id} className={`flex items-center gap-4 p-3 rounded-lg ${
            entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200' : 'bg-gray-50'
          }`}>
            <div className="flex-shrink-0 w-12 flex justify-center">{getRankIcon(entry.rank)}</div>
            <img src={entry.photoUrl} alt={`Photo by ${entry.userName}`} className="w-16 h-16 object-cover rounded-lg" />
            <div className="flex-1">
              <p className="font-semibold">{entry.userName}</p>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <ThumbsUp className="w-4 h-4" />
                <span>{entry.votes} votes</span>
              </div>
            </div>
            {canVote && (
              <Button size="sm" onClick={() => handleVote(entry.id)} disabled={votedPhotos.has(entry.id) || voting === entry.id}>
                {votedPhotos.has(entry.id) ? 'Voted' : voting === entry.id ? 'Voting...' : 'Vote'}
              </Button>
            )}
          </div>
        ))}
      </div>

      {contest.status === 'winners_announced' && leaderboard[0] && (
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-300">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <h4 className="font-bold text-lg">Contest Winner!</h4>
          </div>
          <p className="text-sm"><span className="font-semibold">{leaderboard[0].userName}</span> won with {leaderboard[0].votes} votes!</p>
          <p className="text-sm text-gray-700 mt-1">Prize: {contest.prizeDescription}</p>
        </div>
      )}
    </Card>
  );
}
