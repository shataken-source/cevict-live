import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Save, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface AffiliateCredential {
  id: string;
  retailer: string;
  affiliate_id: string;
  api_key?: string;
  secret_key?: string;
  commission_rate: number;
  is_active: boolean;
}

const retailerInfo = {
  amazon: {
    name: 'Amazon Associates',
    url: 'https://affiliate-program.amazon.com/',
    fields: ['Affiliate Tag/ID'],
  },
  walmart: {
    name: 'Walmart Affiliates',
    url: 'https://affiliates.walmart.com/',
    fields: ['Publisher ID', 'API Key'],
  },
  temu: {
    name: 'Temu Affiliate',
    url: 'https://seller.temu.com/',
    fields: ['Affiliate ID', 'API Key'],
  },
  boatus: {
    name: 'BoatUS Affiliate',
    url: 'https://www.boatus.com/',
    fields: ['Affiliate ID'],
  },
  paypal: {
    name: 'PayPal Partner',
    url: 'https://www.paypal.com/us/webapps/mpp/partner-program',
    fields: ['Client ID', 'Secret Key'],
  },
  venmo: {
    name: 'Venmo Business',
    url: 'https://venmo.com/business/',
    fields: ['Business Profile ID'],
  },
};


export default function AffiliateCredentialsManager() {
  const [credentials, setCredentials] = useState<AffiliateCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_credentials')
        .select('*')
        .order('retailer');

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      toast.error('Failed to load affiliate credentials');
    } finally {
      setLoading(false);
    }
  };

  const updateCredential = async (id: string, updates: Partial<AffiliateCredential>) => {
    try {
      const { error } = await supabase
        .from('affiliate_credentials')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Affiliate credentials updated successfully');
      loadCredentials();
    } catch (error) {
      console.error('Failed to update credential:', error);
      toast.error('Failed to update credentials');
    }
  };

  const toggleSecret = (retailer: string) => {
    setShowSecrets(prev => ({ ...prev, [retailer]: !prev[retailer] }));
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {credentials.map((cred) => {
        const info = retailerInfo[cred.retailer as keyof typeof retailerInfo];
        return (
          <Card key={cred.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{info.name}</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cred.is_active}
                    onCheckedChange={(checked) => 
                      updateCredential(cred.id, { is_active: checked })
                    }
                  />
                  <a 
                    href={info.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Affiliate ID / Tag</Label>
                <div className="flex gap-2">
                  <Input
                    type={showSecrets[cred.retailer] ? 'text' : 'password'}
                    value={cred.affiliate_id}
                    onChange={(e) => 
                      setCredentials(prev => 
                        prev.map(c => c.id === cred.id ? { ...c, affiliate_id: e.target.value } : c)
                      )
                    }
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleSecret(cred.retailer)}
                  >
                    {showSecrets[cred.retailer] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {(cred.retailer === 'walmart' || cred.retailer === 'temu') && (
                <div>
                  <Label>API Key (Optional)</Label>
                  <Input
                    type={showSecrets[cred.retailer] ? 'text' : 'password'}
                    value={cred.api_key || ''}
                    onChange={(e) => 
                      setCredentials(prev => 
                        prev.map(c => c.id === cred.id ? { ...c, api_key: e.target.value } : c)
                      )
                    }
                  />
                </div>
              )}

              {cred.retailer === 'paypal' && (
                <div>
                  <Label>Secret Key</Label>
                  <Input
                    type={showSecrets[cred.retailer] ? 'text' : 'password'}
                    value={cred.secret_key || ''}
                    placeholder="PayPal Secret Key"
                    onChange={(e) => 
                      setCredentials(prev => 
                        prev.map(c => c.id === cred.id ? { ...c, secret_key: e.target.value } : c)
                      )
                    }
                  />
                </div>
              )}


              <div>
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={cred.commission_rate}
                  onChange={(e) => 
                    setCredentials(prev => 
                      prev.map(c => c.id === cred.id ? { ...c, commission_rate: parseFloat(e.target.value) } : c)
                    )
                  }
                />
              </div>

              <Button 
                onClick={() => updateCredential(cred.id, {
                  affiliate_id: cred.affiliate_id,
                  api_key: cred.api_key,
                  secret_key: cred.secret_key,
                  commission_rate: cred.commission_rate,
                })}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save {info.name} Settings
              </Button>

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
