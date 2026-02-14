import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Search } from 'lucide-react';

interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
}

export const FeatureFlagAdmin: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const checkAdminStatus = async (userEmail: string) => {
    setCheckingAuth(true);
    try {
      const { data } = await supabase.functions.invoke('feature-flag-manager', {
        body: { action: 'checkAdmin', email: userEmail }
      });
      setIsAdmin(data?.isAdmin || false);
      if (!data?.isAdmin) {
        toast({ title: 'Access Denied', description: 'You are not an admin user', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Admin check failed:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadFlags = async () => {
    try {
      const { data } = await supabase.functions.invoke('feature-flag-manager', {
        body: { action: 'getAll' }
      });
      setFlags(data?.flags || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load feature flags', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const toggleFlag = async (flagId: string, enabled: boolean) => {
    try {
      await supabase.functions.invoke('feature-flag-manager', {
        body: { action: 'update', flagId, enabled, email }
      });

      setFlags(prev => prev.map(f => f.id === flagId ? { ...f, enabled } : f));
      toast({ title: 'Success', description: 'Feature flag updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update feature flag', variant: 'destructive' });
    }
  };

  const filteredFlags = flags.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedFlags = filteredFlags.reduce((acc, flag) => {
    const cat = flag.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(flag);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  if (!isAdmin) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Admin Access Required</CardTitle>
          <CardDescription>Enter your admin email to manage feature flags</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={() => checkAdminStatus(email)} disabled={checkingAuth} className="w-full">
            {checkingAuth && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verify Admin Access
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Flag Management</CardTitle>
          <CardDescription>Enable or disable features across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
                <div key={category}>
                  <h3 className="font-semibold text-lg mb-3 capitalize">{category}</h3>
                  <div className="space-y-3">
                    {categoryFlags.map(flag => (
                      <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{flag.name}</span>
                            <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                              {flag.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{flag.description || flag.id}</p>
                        </div>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(checked) => toggleFlag(flag.id, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
