import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Mail, MessageSquare, Clock } from 'lucide-react';

export default function AlertHistoryPanel() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('captain-weather-alerts', {
      body: { action: 'getAlertHistory', captainId: 'current-captain' }
    });
    if (data?.history) {
      setHistory(data.history);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getAlertColor = (type: string) => {
    if (type.includes('Wave')) return 'bg-blue-100 text-blue-800';
    if (type.includes('Wind')) return 'bg-orange-100 text-orange-800';
    if (type.includes('Temp')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Alert History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No alerts sent yet</div>
        ) : (
          <div className="space-y-3">
            {history.map(alert => (
              <Card key={alert.id} className="border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getAlertColor(alert.alertType)}>
                          {alert.alertType}
                        </Badge>
                        <span className="text-sm font-medium">Buoy {alert.buoyId}</span>
                      </div>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(alert.createdAt)}
                        </span>
                        {alert.sentViaEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email
                          </span>
                        )}
                        {alert.sentViaSms && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            SMS
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-500">Threshold</div>
                      <div className="font-semibold">{alert.thresholdValue}</div>
                      <div className="text-gray-500 mt-1">Actual</div>
                      <div className="font-semibold text-red-600">{alert.actualValue}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
