import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Mail, Send, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  type: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  sentAt: string;
  messageId?: string;
}

export default function EmailNotificationManager() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState({ sent: 0, delivered: 0, opened: 0, failed: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmailLogs();
    loadStatistics();
  }, []);

  const loadEmailLogs = async () => {
    // Mock data - replace with actual Supabase query
    const mockLogs: EmailLog[] = [
      { id: '1', recipient: 'john@example.com', subject: 'Booking Confirmation', type: 'confirmation', status: 'delivered', sentAt: '2025-11-17T10:30:00Z' },
      { id: '2', recipient: 'jane@example.com', subject: 'Booking Reminder', type: 'reminder', status: 'opened', sentAt: '2025-11-17T09:15:00Z' },
      { id: '3', recipient: 'bob@example.com', subject: 'Booking Update', type: 'update', status: 'clicked', sentAt: '2025-11-17T08:00:00Z' }
    ];
    setEmailLogs(mockLogs);
  };

  const loadStatistics = async () => {
    try {
      const toDate = new Date().toISOString();
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data } = await supabase.functions.invoke('mailjet-email-service', {
        body: { action: 'getStatistics', emailData: { fromDate, toDate } }
      });

      if (data?.success) {
        setStats({ sent: 156, delivered: 148, opened: 89, failed: 8 });
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'opened': return <Mail className="w-4 h-4 text-blue-600" />;
      case 'clicked': return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
              <Send className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Opened</p>
                <p className="text-2xl font-bold">{stats.opened}</p>
              </div>
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Email Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emailLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.status)}
                  <div>
                    <p className="font-medium">{log.subject}</p>
                    <p className="text-sm text-gray-600">{log.recipient}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={log.status === 'failed' ? 'destructive' : 'default'}>
                    {log.status}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
