import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Ban, CheckCircle, XCircle, Download, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Subscriber {
  id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  status: string;
  subscribed_at: string;
}

export default function MailingListManager() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSubscribers();
    loadStats();
  }, [filter]);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mailing-list-manager', {
        body: {
          action: 'list',
          data: {
            status: filter === 'all' ? undefined : filter,
            limit: 1000
          }
        }
      });

      if (error) throw error;
      if (data.success) {
        setSubscribers(data.subscribers || []);
      }
    } catch (error: any) {
      toast.error('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await supabase.functions.invoke('mailing-list-manager', {
        body: { action: 'stats' }
      });
      if (data?.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('mailing-list-manager', {
        body: {
          action: 'update',
          data: { id, updates: { status } }
        }
      });

      if (error) throw error;
      if (data.success) {
        toast.success(`Subscriber ${status}`);
        loadSubscribers();
        loadStats();
      }
    } catch (error: any) {
      toast.error('Failed to update subscriber');
    }
  };

  const deleteSubscriber = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('mailing-list-manager', {
        body: {
          action: 'delete',
          data: { id }
        }
      });

      if (error) throw error;
      if (data.success) {
        toast.success('Subscriber deleted');
        loadSubscribers();
        loadStats();
      }
    } catch (error: any) {
      toast.error('Failed to delete subscriber');
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Email', 'Phone', 'First Name', 'Last Name', 'Email Enabled', 'SMS Enabled', 'Status', 'Subscribed At'],
      ...filteredSubscribers.map(s => [
        s.email || '',
        s.phone || '',
        s.first_name || '',
        s.last_name || '',
        s.email_enabled ? 'Yes' : 'No',
        s.sms_enabled ? 'Yes' : 'No',
        s.status,
        new Date(s.subscribed_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mailing-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredSubscribers = subscribers.filter(s => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      s.email?.toLowerCase().includes(searchLower) ||
      s.phone?.includes(search) ||
      s.first_name?.toLowerCase().includes(searchLower) ||
      s.last_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Mailing List Manager</h2>
        <p className="text-muted-foreground">Manage subscribers and send campaigns</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Subscribers</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.emailEnabled}</div>
            <div className="text-sm text-muted-foreground">Email Enabled</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.smsEnabled}</div>
            <div className="text-sm text-muted-foreground">SMS Enabled</div>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, phone, or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subscribers</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Preferences</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSubscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No subscribers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell>
                      <div className="space-y-1">
                        {subscriber.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3" />
                            {subscriber.email}
                          </div>
                        )}
                        {subscriber.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3" />
                            {subscriber.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscriber.first_name} {subscriber.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {subscriber.email_enabled && <Badge variant="secondary">Email</Badge>}
                        {subscriber.sms_enabled && <Badge variant="secondary">SMS</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        subscriber.status === 'active' ? 'default' :
                        subscriber.status === 'blocked' ? 'destructive' : 'secondary'
                      }>
                        {subscriber.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(subscriber.subscribed_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {subscriber.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(subscriber.id, 'blocked')}
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        )}
                        {subscriber.status === 'blocked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(subscriber.id, 'active')}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteSubscriber(subscriber.id)}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
