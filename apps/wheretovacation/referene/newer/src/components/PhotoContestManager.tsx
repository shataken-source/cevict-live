import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trophy, Calendar, Award, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PhotoContestVoteAnalytics from './PhotoContestVoteAnalytics';

interface Contest {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  prizeDescription: string;
  prizeAmount: number;
  status: 'submission' | 'voting' | 'ended' | 'winners_announced';
}

export default function PhotoContestManager({ eventId, isOrganizer }: { eventId: string; isOrganizer: boolean }) {
  const [contest, setContest] = useState<Contest | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    prizeDescription: '',
    prizeAmount: 0
  });

  useEffect(() => {
    loadContest();
  }, [eventId]);

  const loadContest = () => {
    const stored = localStorage.getItem(`contest_${eventId}`);
    if (stored) setContest(JSON.parse(stored));
  };

  const createContest = () => {
    const newContest: Contest = {
      id: crypto.randomUUID(),
      ...formData,
      status: 'submission'
    };
    localStorage.setItem(`contest_${eventId}`, JSON.stringify(newContest));
    setContest(newContest);
    setIsCreating(false);
  };

  const startVoting = () => {
    if (!contest) return;
    const updated = { ...contest, status: 'voting' as const };
    localStorage.setItem(`contest_${eventId}`, JSON.stringify(updated));
    setContest(updated);
  };

  const endContest = async () => {
    if (!contest) return;
    
    const { data } = await supabase.functions.invoke('photo-contest-manager', {
      body: { action: 'selectWinner', eventId, contestData: contest }
    });

    const updated = { ...contest, status: 'winners_announced' as const };
    localStorage.setItem(`contest_${eventId}`, JSON.stringify(updated));
    setContest(updated);
  };

  if (!isOrganizer) return null;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Photo Contest</h3>
          </div>
          {contest && (
            <Button size="sm" variant="outline" onClick={() => setShowAnalytics(!showAnalytics)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              {showAnalytics ? 'Hide' : 'Show'} Analytics
            </Button>
          )}
        </div>

        {!contest && !isCreating && (
          <Button onClick={() => setIsCreating(true)}>Create Contest</Button>
        )}

        {isCreating && (
          <div className="space-y-4">
            <div><Label>Contest Title</Label><Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="datetime-local" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} /></div>
            </div>
            <div><Label>Prize Description</Label><Input value={formData.prizeDescription} onChange={(e) => setFormData({...formData, prizeDescription: e.target.value})} /></div>
            <div><Label>Prize Points</Label><Input type="number" value={formData.prizeAmount} onChange={(e) => setFormData({...formData, prizeAmount: parseFloat(e.target.value)})} /></div>
            <div className="flex gap-2">
              <Button onClick={createContest}>Create</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {contest && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">{contest.title}</h4>
              <p className="text-sm text-gray-600">{contest.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(contest.startDate).toLocaleDateString()} - {new Date(contest.endDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                <span>{contest.prizeDescription}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                contest.status === 'submission' ? 'bg-blue-100 text-blue-700' :
                contest.status === 'voting' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {contest.status === 'submission' ? 'Accepting Submissions' :
                 contest.status === 'voting' ? 'Voting Open' :
                 contest.status === 'ended' ? 'Voting Ended' : 'Winner Announced'}
              </span>
            </div>
            {contest.status === 'submission' && <Button onClick={startVoting}>Start Voting Phase</Button>}
            {contest.status === 'voting' && new Date() > new Date(contest.endDate) && <Button onClick={endContest}>End Contest & Select Winner</Button>}
            {contest.status === 'winners_announced' && (
              <div className="bg-yellow-50 p-4 rounded-lg"><p className="text-sm font-semibold">Contest Ended - Winner Announced!</p></div>
            )}
          </div>
        )}
      </Card>

      {contest && showAnalytics && <PhotoContestVoteAnalytics eventId={eventId} />}
    </div>
  );
}
