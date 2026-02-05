import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, CheckCircle, Clock, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Payout {
  id: string;
  affiliateId: string;
  affiliateName: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  referrals: number;
  requestDate: string;
  paymentMethod: string;
}

export default function AffiliatePayoutManager() {
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [payouts, setPayouts] = useState<Payout[]>([
    { id: '1', affiliateId: 'AFF001', affiliateName: 'John Captain', amount: 456.50, status: 'pending', referrals: 12, requestDate: '2024-01-20', paymentMethod: 'PayPal' },
    { id: '2', affiliateId: 'AFF002', affiliateName: 'Sarah Fisher', amount: 289.00, status: 'pending', referrals: 8, requestDate: '2024-01-22', paymentMethod: 'Bank Transfer' },
    { id: '3', affiliateId: 'AFF003', affiliateName: 'Mike Angler', amount: 678.25, status: 'approved', referrals: 18, requestDate: '2024-01-18', paymentMethod: 'PayPal' },
    { id: '4', affiliateId: 'AFF004', affiliateName: 'Lisa Waters', amount: 234.75, status: 'paid', referrals: 6, requestDate: '2024-01-15', paymentMethod: 'Stripe' }
  ]);

  const approvePayout = (id: string) => {
    setPayouts(payouts.map(p => p.id === id ? { ...p, status: 'approved' as const } : p));
    toast({ title: 'Payout approved', description: 'Ready for processing' });
  };

  const processPayout = (id: string) => {
    setPayouts(payouts.map(p => p.id === id ? { ...p, status: 'paid' as const } : p));
    toast({ title: 'Payout processed', description: 'Payment sent successfully' });
  };

  const batchApprove = () => {
    setPayouts(payouts.map(p => p.status === 'pending' ? { ...p, status: 'approved' as const } : p));
    toast({ title: 'Batch approved', description: 'All pending payouts approved' });
  };

  const filteredPayouts = payouts.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.affiliateName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalApproved = payouts.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${totalPending.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Approved Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalApproved.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Affiliates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{payouts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payout Requests</CardTitle>
            <Button onClick={batchApprove}>Batch Approve Pending</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input placeholder="Search affiliates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredPayouts.map(payout => (
              <div key={payout.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{payout.affiliateName}</p>
                  <p className="text-sm text-gray-500">{payout.affiliateId} • {payout.referrals} referrals • {payout.paymentMethod}</p>
                  <p className="text-xs text-gray-400">{payout.requestDate}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold">${payout.amount.toFixed(2)}</p>
                    <Badge variant={payout.status === 'paid' ? 'default' : payout.status === 'approved' ? 'secondary' : 'outline'}>
                      {payout.status}
                    </Badge>
                  </div>
                  {payout.status === 'pending' && (
                    <Button onClick={() => approvePayout(payout.id)} size="sm">Approve</Button>
                  )}
                  {payout.status === 'approved' && (
                    <Button onClick={() => processPayout(payout.id)} size="sm" variant="default">Process</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
