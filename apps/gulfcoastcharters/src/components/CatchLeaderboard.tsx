import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trophy, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { SocialShareButton } from './SocialShareButton';

interface Catch {
  id: string;
  weight: number;
  length: number;
  location: string;
  catch_date: string;
  photo_url: string;
  is_verified: boolean;
  fish_species: { name: string };
  user_profiles: { display_name: string; email: string };
}

export default function CatchLeaderboard() {
  const [catches, setCatches] = useState<Catch[]>([]);
  const [species, setSpecies] = useState<any[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedSpecies]);

  const loadData = async () => {
    setLoading(true);
    
    const [speciesRes, catchesRes] = await Promise.all([
      supabase.functions.invoke('catch-logger', { body: { action: 'get_species' } }),
      supabase.functions.invoke('catch-logger', {
        body: {
          action: 'get_leaderboard',
          species_id: selectedSpecies === 'all' ? null : selectedSpecies,
          limit: 20
        }
      })
    ]);

    if (speciesRes.data?.species) setSpecies(speciesRes.data.species);
    if (catchesRes.data?.leaderboard) setCatches(catchesRes.data.leaderboard);
    
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Catch Leaderboard
          </CardTitle>
          <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Species</SelectItem>
              {species.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : catches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No catches logged yet</div>
        ) : (
          <div className="space-y-4">
            {catches.map((c, idx) => (
              <div key={c.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                  {idx + 1}
                </div>
                {c.photo_url && (
                  <img src={c.photo_url} alt="Catch" className="w-24 h-24 object-cover rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{c.weight} lbs - {c.fish_species.name}</h3>
                    {c.is_verified && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Caught by {c.user_profiles.display_name || c.user_profiles.email}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {c.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(c.catch_date).toLocaleDateString()}
                    </span>
                    {c.length && <span>{c.length}"</span>}
                  </div>
                </div>
                <SocialShareButton
                  type="catch"
                  data={{
                    id: c.id,
                    species: c.fish_species.name,
                    weight: c.weight,
                    location: c.location,
                    date: new Date(c.catch_date).toLocaleDateString(),
                    username: c.user_profiles.display_name || c.user_profiles.email,
                    isVerified: c.is_verified,
                    shareText: `Check out this ${c.weight}lb ${c.fish_species.name} caught at ${c.location}!`
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}