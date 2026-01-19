import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AffiliateTier {
  name: string;
  minReferrals: number;
  commissionRate: number;
  color: string;
}

const tiers: AffiliateTier[] = [
  { name: 'Bronze', minReferrals: 0, commissionRate: 5, color: 'bg-orange-600' },
  { name: 'Silver', minReferrals: 5, commissionRate: 8, color: 'bg-gray-400' },
  { name: 'Gold', minReferrals: 15, commissionRate: 12, color: 'bg-yellow-500' },
  { name: 'Platinum', minReferrals: 30, commissionRate: 15, color: 'bg-purple-600' }
];

export default function AffiliateMarketingDashboard({ userId }: { userId: string }) {
  const [affiliateCode, setAffiliateCode] = useState('');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completedBookings: 0,
    totalCommission: 0,
    pendingCommission: 0,
    currentTier: tiers[0]
  });
  const [referrals, setReferrals] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAffiliateData();
  }, [userId]);

  const loadAffiliateData = async () => {
    const code = `AFF-${userId.substring(0, 8).toUpperCase()}`;
    setAffiliateCode(code);

    // Mock data - replace with actual Supabase query
    const mockReferrals = [
      { id: 1, name: 'John Doe', bookingValue: 450, commission: 22.50, status: 'completed', date: '2024-01-15' },
      { id: 2, name: 'Jane Smith', bookingValue: 680, commission: 34.00, status: 'completed', date: '2024-01-20' },
      { id: 3, name: 'Mike Johnson', bookingValue: 320, commission: 16.00, status: 'pending', date: '2024-01-25' }
    ];

    setReferrals(mockReferrals);
    const completed = mockReferrals.filter(r => r.status === 'completed').length;
    const currentTier = tiers.reverse().find(t => completed >= t.minReferrals) || tiers[0];
    
    setStats({
      totalReferrals: mockReferrals.length,
      completedBookings: completed,
      totalCommission: mockReferrals.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.commission, 0),
      pendingCommission: mockReferrals.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.commission, 0),
      currentTier
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(affiliateCode);
    toast({ title: 'Affiliate code copied!', description: 'Share it to earn commissions' });
  };

  const shareUrl = `${window.location.origin}?aff=${affiliateCode}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Affiliate Program</h2>
        <Badge className={`${stats.currentTier.color} text-white text-lg px-4 py-2`}>
          {stats.currentTier.name} - {stats.currentTier.commissionRate}% Commission
        </Badge>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalReferrals}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completed Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.completedBookings}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">${stats.totalCommission.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">${stats.pendingCommission.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-blue-300">
        <CardHeader>
          <CardTitle>Your Affiliate Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={affiliateCode} readOnly className="font-mono text-xl font-bold" />
            <Button onClick={copyCode}><Copy className="h-4 w-4" /></Button>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <p className="font-semibold mb-2">Earn {stats.currentTier.commissionRate}% on every first booking!</p>
            <ul className="text-sm space-y-1">
              <li>• Share your code with captains or customers</li>
              <li>• Earn commission when they complete their first booking</li>
              <li>• Higher tiers = higher commission rates</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {tiers.map(tier => (
              <div key={tier.name} className={`p-4 rounded-lg border-2 ${stats.completedBookings >= tier.minReferrals ? 'border-green-500' : 'border-gray-200'}`}>
                <div className={`${tier.color} text-white px-3 py-1 rounded-full text-sm font-bold inline-block mb-2`}>
                  {tier.name}
                </div>
                <p className="text-2xl font-bold">{tier.commissionRate}%</p>
                <p className="text-sm text-gray-600">{tier.minReferrals}+ referrals</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {referrals.map(ref => (
              <div key={ref.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{ref.name}</p>
                  <p className="text-sm text-gray-500">{ref.date} • Booking: ${ref.bookingValue}</p>
                </div>
                <div className="text-right">
                  <Badge variant={ref.status === 'completed' ? 'default' : 'secondary'}>
                    {ref.status === 'completed' ? `+$${ref.commission}` : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
