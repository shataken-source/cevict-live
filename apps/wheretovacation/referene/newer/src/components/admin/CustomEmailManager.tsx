import { useState, useEffect } from 'react';
import { Mail, Search, Award, DollarSign, Gift, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CustomEmail {
  id: string;
  email_address: string;
  email_prefix: string;
  user_type: string;
  payment_method: string;
  amount_paid: number;
  points_spent: number;
  is_active: boolean;
  user_email: string;
  user_name: string;
  purchased_at: string;
}

export default function CustomEmailManager() {
  const [emails, setEmails] = useState<CustomEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'captain' | 'customer'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_emails_admin_view')
        .select('*')
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_emails')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Email ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      fetchEmails();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const grantEmailAsPrize = async (userId: string, emailPrefix: string) => {
    try {
      const { error } = await supabase.functions.invoke('grant-custom-email-prize', {
        body: { userId, emailPrefix }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom email granted as prize!",
      });

      fetchEmails();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.email_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || email.user_type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: emails.length,
    active: emails.filter(e => e.is_active).length,
    captains: emails.filter(e => e.user_type === 'captain').length,
    revenue: emails.reduce((sum, e) => sum + (e.amount_paid || 0), 0),
    pointsUsed: emails.reduce((sum, e) => sum + (e.points_spent || 0), 0)
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 h-96 rounded-lg"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Custom Email Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEmails}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <Mail className="h-5 w-5 text-blue-600 mb-2" />
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Emails</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <ToggleRight className="h-5 w-5 text-green-600 mb-2" />
          <div className="text-2xl font-bold">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <Mail className="h-5 w-5 text-purple-600 mb-2" />
          <div className="text-2xl font-bold">{stats.captains}</div>
          <div className="text-sm text-gray-600">Captains</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <DollarSign className="h-5 w-5 text-green-600 mb-2" />
          <div className="text-2xl font-bold">${stats.revenue}</div>
          <div className="text-sm text-gray-600">Revenue</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <Award className="h-5 w-5 text-yellow-600 mb-2" />
          <div className="text-2xl font-bold">{stats.pointsUsed.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Points Used</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search emails or users..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Types</option>
          <option value="captain">Captains</option>
          <option value="customer">Customers</option>
        </select>
      </div>

      {/* Email List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 font-semibold">Email Address</th>
              <th className="text-left p-4 font-semibold">User</th>
              <th className="text-left p-4 font-semibold">Type</th>
              <th className="text-left p-4 font-semibold">Payment</th>
              <th className="text-left p-4 font-semibold">Status</th>
              <th className="text-left p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmails.map((email) => (
              <tr key={email.id} className="border-t hover:bg-gray-50">
                <td className="p-4 font-mono text-sm">{email.email_address}</td>
                <td className="p-4">
                  <div className="text-sm font-medium">{email.user_name}</div>
                  <div className="text-xs text-gray-500">{email.user_email}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    email.user_type === 'captain' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {email.user_type}
                  </span>
                </td>
                <td className="p-4">
                  {email.payment_method === 'cash' && (
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="h-4 w-4" />
                      ${email.amount_paid}
                    </div>
                  )}
                  {email.payment_method === 'points' && (
                    <div className="flex items-center gap-1 text-sm">
                      <Award className="h-4 w-4" />
                      {email.points_spent} pts
                    </div>
                  )}
                  {email.payment_method === 'prize' && (
                    <div className="flex items-center gap-1 text-sm">
                      <Gift className="h-4 w-4" />
                      Prize
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    email.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {email.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleEmailStatus(email.id, email.is_active)}
                  >
                    {email.is_active ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
