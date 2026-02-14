import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function UserInterestsManager() {
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [suggestedInterests, setSuggestedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInterests();
    generateSuggestions();
  }, []);

  const loadInterests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_interests')
      .select('interests')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) setInterests(data.interests || []);
  };

  const generateSuggestions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('charter_id, created_at')
      .eq('user_id', user.id)
      .limit(10);

    const { data, error } = await supabase.functions.invoke('ai-personalization-engine', {
      body: { action: 'analyze_interests', userId: user.id, data: { behavior: bookings } }
    });

    if (!error && data?.data) {
      setSuggestedInterests(data.data);
    }
    setLoading(false);
  };

  const addInterest = async (interest: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updated = [...interests, interest];
    setInterests(updated);

    await supabase.from('user_interests').upsert({
      user_id: user.id,
      interests: updated,
      updated_at: new Date().toISOString()
    });

    toast({ title: 'Interest added!' });
  };

  const removeInterest = async (interest: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updated = interests.filter(i => i !== interest);
    setInterests(updated);

    await supabase.from('user_interests').upsert({
      user_id: user.id,
      interests: updated,
      updated_at: new Date().toISOString()
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Your Interests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add interest (e.g., 'Deep sea fishing in Miami')"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && newInterest && addInterest(newInterest) && setNewInterest('')}
          />
          <Button onClick={() => { addInterest(newInterest); setNewInterest(''); }} disabled={!newInterest}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {interests.map(interest => (
            <Badge key={interest} variant="secondary" className="gap-1">
              {interest}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeInterest(interest)} />
            </Badge>
          ))}
        </div>

        {suggestedInterests.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Suggested based on your activity:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedInterests.map(interest => (
                <Badge key={interest} variant="outline" className="cursor-pointer" onClick={() => addInterest(interest)}>
                  + {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}