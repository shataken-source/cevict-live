import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Share2, ThumbsUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SocialShareButton } from '@/components/SocialShareButton';

export function CatchOfTheDay() {
  const [catchOfDay, setCatchOfDay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState(0);

  useEffect(() => {
    loadCatchOfTheDay();
  }, []);

  const loadCatchOfTheDay = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('catch-of-the-day', {
        body: { action: 'getToday' }
      });

      if (data?.catchOfTheDay) {
        setCatchOfDay(data.catchOfTheDay);
        setVotes(Math.floor(Math.random() * 150) + 50);
      }
    } catch (err) {
      console.error('Error loading catch of the day:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = () => {
    setVotes(votes + 1);
  };

  if (loading) return <div className="animate-pulse h-64 bg-gray-200 rounded-lg"></div>;
  if (!catchOfDay) return null;

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Trophy className="h-6 w-6 text-yellow-600" />
          Catch of the Day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative">
            <img 
              src={catchOfDay.photo_url || '/placeholder.svg'} 
              alt={catchOfDay.species}
              className="w-full h-64 object-cover rounded-lg"
            />
            <Badge className="absolute top-2 right-2 bg-yellow-500">
              Featured
            </Badge>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{catchOfDay.species}</h3>
              <p className="text-3xl font-bold text-blue-600">{catchOfDay.weight} lbs</p>
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Location:</strong> {catchOfDay.location}</p>
              <p><strong>Angler:</strong> {catchOfDay.angler_name || 'Anonymous'}</p>
              <p><strong>Date:</strong> {new Date(catchOfDay.catch_date).toLocaleDateString()}</p>
            </div>
            {catchOfDay.notes && (
              <p className="text-sm italic">{catchOfDay.notes}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleVote} variant="outline" className="flex-1">
                <ThumbsUp className="h-4 w-4 mr-2" />
                Vote ({votes})
              </Button>
              <SocialShareButton
                type="catch"
                data={{
                  id: catchOfDay.id,
                  species: catchOfDay.species,
                  weight: catchOfDay.weight,
                  location: catchOfDay.location,
                  shareText: `Check out this ${catchOfDay.weight}lb ${catchOfDay.species}! Catch of the Day on Gulf Coast Charters!`
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}