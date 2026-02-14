import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueAnalyticsDashboard } from '@/components/monetization/RevenueAnalyticsDashboard';
import { PremiumSubscriptionPlans } from '@/components/monetization/PremiumSubscriptionPlans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Settings, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function AdminMonetization() {
  const [commissionRate, setCommissionRate] = useState(12);
  const [serviceFeeRate, setServiceFeeRate] = useState(8);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('monetization_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['platform_commission_rate', 'service_fee_rate']);
      if (data) {
        data.forEach((row: { setting_key: string; setting_value: string }) => {
          const v = parseFloat(row.setting_value);
          if (row.setting_key === 'platform_commission_rate' && !Number.isNaN(v)) setCommissionRate(Math.round(v * 100));
          if (row.setting_key === 'service_fee_rate' && !Number.isNaN(v)) setServiceFeeRate(Math.round(v * 100));
        });
      }
    } catch (_) {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await supabase.from('monetization_settings').upsert(
        [
          { setting_key: 'platform_commission_rate', setting_value: String(commissionRate / 100), description: 'Default platform commission rate', updated_at: new Date().toISOString() },
          { setting_key: 'service_fee_rate', setting_value: String(serviceFeeRate / 100), description: 'Default service fee rate', updated_at: new Date().toISOString() }
        ],
        { onConflict: 'setting_key' }
      );
      toast({ title: 'Settings saved', description: 'Commission and service fee rates updated.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Monetization Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage revenue streams, commission rates, and subscription plans
          </p>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="settings">Commission Settings</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscription Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <RevenueAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Commission & Fee Settings
              </CardTitle>
              <CardDescription>
                Configure platform commission rates and customer service fees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commission">Platform Commission Rate (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    value={loading ? '' : commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Percentage taken from each booking (paid by captain)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceFee">Customer Service Fee (%)</Label>
                  <Input
                    id="serviceFee"
                    type="number"
                    min="0"
                    max="100"
                    value={loading ? '' : serviceFeeRate}
                    onChange={(e) => setServiceFeeRate(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Additional fee charged to customers at checkout
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Example Calculation
                </h4>
                <div className="space-y-1 text-sm">
                  <p>Booking Amount: $500.00</p>
                  <p>Platform Commission ({commissionRate}%): ${(500 * commissionRate / 100).toFixed(2)}</p>
                  <p>Service Fee ({serviceFeeRate}%): ${(500 * serviceFeeRate / 100).toFixed(2)}</p>
                  <p className="font-semibold pt-2 border-t">
                    Total Platform Revenue: ${((500 * commissionRate / 100) + (500 * serviceFeeRate / 100)).toFixed(2)}
                  </p>
                  <p className="font-semibold">
                    Captain Payout: ${(500 - (500 * commissionRate / 100)).toFixed(2)}
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveSettings} className="w-full" disabled={loading || saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Captain Subscription Plans</CardTitle>
              <CardDescription>
                Premium plans with reduced commission rates and additional features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PremiumSubscriptionPlans currentPlan="basic" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
