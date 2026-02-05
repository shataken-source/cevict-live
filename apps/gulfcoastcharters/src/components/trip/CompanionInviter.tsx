import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Companion {
  id?: string;
  email: string;
  status: 'invited' | 'accepted' | 'declined';
}

interface CompanionInviterProps {
  companions: Companion[];
  onInvite: (email: string) => Promise<void>;
  onRemove: (id: string) => void;
}

export default function CompanionInviter({ companions, onInvite, onRemove }: CompanionInviterProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      toast({ title: 'Invalid email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await onInvite(email);
      setEmail('');
      toast({ title: 'Invitation sent!' });
    } catch (error) {
      toast({ title: 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Trip Companions</h3>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="pl-10"
            onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
          />
        </div>
        <Button onClick={handleInvite} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </div>

      <div className="space-y-2">
        {companions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No companions invited yet
          </p>
        ) : (
          companions.map((companion) => (
            <div key={companion.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{companion.email}</p>
                  <Badge className={getStatusColor(companion.status)} variant="secondary">
                    {companion.status}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => companion.id && onRemove(companion.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
