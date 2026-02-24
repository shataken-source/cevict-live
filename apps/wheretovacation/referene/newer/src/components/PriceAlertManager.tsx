import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Trash2, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface PriceAlert {
  id: string;
  charter_id: string;
  charter_name: string;
  target_price: number;
  current_price: number;
  created_at: string;
}

export default function PriceAlertManager() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.filter(a => a.id !== alertId));
      toast({ title: 'Alert Deleted', description: 'Price alert has been removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete alert.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Price Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingDown className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No price alerts set</p>
              <p className="text-sm mt-1">Browse charters and click "Set Price Alert" to get notified when prices drop</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{alert.charter_name}</h4>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        Current: <span className="font-semibold">${alert.current_price}</span>
                      </span>
                      <span className="text-green-600">
                        Alert at: <span className="font-semibold">${alert.target_price}</span>
                      </span>
                      {alert.current_price <= alert.target_price && (
                        <span className="text-green-600 font-semibold">✓ Price reached!</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
