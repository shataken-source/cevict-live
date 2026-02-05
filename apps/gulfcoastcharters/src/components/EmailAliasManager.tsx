import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, Send, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmailAlias {
  id: string;
  alias_address: string;
  forward_to: string;
  is_active: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
}

interface EmailAliasManagerProps {
  customEmailId: string;
  subscriptionTier: 'basic' | 'pro' | 'premium';
}

export default function EmailAliasManager({ customEmailId, subscriptionTier }: EmailAliasManagerProps) {
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ aliasAddress: '', forwardTo: '' });

  const limits = { basic: 1, pro: 3, premium: 10 };
  const maxAliases = limits[subscriptionTier];

  useEffect(() => {
    loadAliases();
  }, [customEmailId]);

  const loadAliases = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('email-alias-manager', {
        body: { action: 'list', customEmailId, userId: user.id }
      });

      if (error) throw error;
      setAliases(data.aliases || []);
    } catch (error: any) {
      toast.error('Failed to load aliases');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (aliases.length >= maxAliases && !editingId) {
      toast.error(`Maximum ${maxAliases} aliases for ${subscriptionTier} plan`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('email-alias-manager', {
        body: {
          action: editingId ? 'update' : 'create',
          aliasId: editingId,
          customEmailId,
          aliasAddress: formData.aliasAddress,
          forwardTo: formData.forwardTo,
          userId: user.id
        }
      });

      if (error) throw error;
      
      toast.success(editingId ? 'Alias updated' : 'Alias created');
      setFormData({ aliasAddress: '', forwardTo: '' });
      setShowAddForm(false);
      setEditingId(null);
      loadAliases();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this alias?')) return;
    
    setLoading(true);
    try {
      await supabase.functions.invoke('email-alias-manager', {
        body: { action: 'delete', aliasId: id }
      });
      toast.success('Alias deleted');
      loadAliases();
    } catch (error: any) {
      toast.error('Failed to delete alias');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (aliasAddress: string) => {
    setLoading(true);
    try {
      await supabase.functions.invoke('email-alias-manager', {
        body: { action: 'test', aliasAddress }
      });
      toast.success('Test email sent!');
    } catch (error: any) {
      toast.error('Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Aliases</CardTitle>
        <CardDescription>
          {aliases.length} / {maxAliases} aliases used
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {aliases.map((alias) => (
          <div key={alias.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{alias.alias_address}</div>
              <div className="text-sm text-muted-foreground">→ {alias.forward_to}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Used {alias.usage_count} times
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleTest(alias.alias_address)}>
                <Send className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(alias.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {showAddForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
            <div>
              <Label>Alias Address</Label>
              <Input
                placeholder="name@gulfcoastcharters.com"
                value={formData.aliasAddress}
                onChange={(e) => setFormData({ ...formData, aliasAddress: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Forward To</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={formData.forwardTo}
                onChange={(e) => setFormData({ ...formData, forwardTo: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>Create Alias</Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {!showAddForm && aliases.length < maxAliases && (
          <Button onClick={() => setShowAddForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Alias
          </Button>
        )}
      </CardContent>
    </Card>
  );
}