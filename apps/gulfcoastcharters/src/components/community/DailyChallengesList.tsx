/**
 * Daily Challenges - uses /api/community/challenges and /api/community/challenges/complete
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, CheckCircle } from 'lucide-react';

type Challenge = {
  challenge_id: string;
  challenge_type: string;
  title: string;
  description: string | null;
  points_reward: number;
  action_required: string;
  reset_frequency: string;
};

export default function DailyChallengesList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/community/challenges');
      const data = await res.json();
      if (data.challenges) setChallenges(data.challenges);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const complete = async (challengeId: string) => {
    setCompleting(challengeId);
    try {
      const res = await fetch('/api/community/challenges/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      if (data.completed) load();
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Trophy className="w-5 h-5" /> Daily Challenges
      </h3>
      {loading ? (
        <p className="text-gray-500">Loading challenges...</p>
      ) : challenges.length === 0 ? (
        <p className="text-gray-500">No active challenges right now. Check back later!</p>
      ) : (
        <div className="grid gap-3">
          {challenges.map((c) => (
            <Card key={c.challenge_id}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-600 uppercase">{c.challenge_type}</span>
                    <span className="text-xs text-gray-500">• {c.points_reward} pts</span>
                  </div>
                  <h4 className="font-semibold">{c.title}</h4>
                  {c.description && <p className="text-sm text-gray-600">{c.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">Action: {c.action_required}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => complete(c.challenge_id)}
                  disabled={!!completing}
                >
                  {completing === c.challenge_id ? (
                    'Completing...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" /> Complete
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
