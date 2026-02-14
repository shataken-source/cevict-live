import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, MapPin, Fish, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function FishingBuddyFinder() {
  const [buddies, setBuddies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBuddies();
  }, []);

  const loadBuddies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('fishing-buddy-finder', {
        body: { action: 'findBuddies', userId: user?.id }
      });

      if (data?.buddies) {
        setBuddies(data.buddies);
      }
    } catch (err) {
      console.error('Error loading buddies:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (buddyId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('fishing-buddy-finder', {
        body: { 
          action: 'sendRequest', 
          userId: user?.id,
          buddyId,
          message: 'Would love to go fishing together!'
        }
      });

      toast({
        title: 'Request Sent!',
        description: 'Your fishing buddy request has been sent.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send request',
        variant: 'destructive'
      });
    }
  };

  if (loading) return <div className="animate-pulse h-96 bg-gray-200 rounded-lg"></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Find Fishing Buddies
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buddies.map((buddy) => (
            <Card key={buddy.user_id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={buddy.avatar_url} />
                    <AvatarFallback>{buddy.full_name?.[0] || 'A'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{buddy.full_name || 'Angler'}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{buddy.location || 'Gulf Coast'}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Fish className="h-3 w-3 mr-1" />
                        {buddy.total_catches || 0} catches
                      </Badge>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => sendRequest(buddy.user_id)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Connect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}