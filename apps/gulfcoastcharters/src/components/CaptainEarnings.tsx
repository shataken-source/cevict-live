import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CaptainEarnings({ captainId }: { captainId: string }) {
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    pendingPayout: 0,
    thisMonth: 0,
    lastPayout: 0,
    payoutHistory: []
  });

  useEffect(() => {
    loadEarnings();
  }, [captainId]);

  const loadEarnings = async () => {
    try {
      const response = await fetch('/api/captain/earnings');
      const result = await response.json();
      if (result.success && result.earnings) {
        setEarnings(result.earnings);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  };

  const requestPayout = async () => {
    try {
      const response = await fetch('/api/captain/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'requestPayout' }),
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message || 'Payout request submitted! Funds will be transferred within 3-5 business days.');
        loadEarnings();
      } else {
        alert('Failed to request payout. Please try again.');
      }
    } catch (error) {
      alert('Failed to request payout. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold">${earnings.totalEarnings}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold">${earnings.thisMonth}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Pending Payout</p>
              <p className="text-2xl font-bold">${earnings.pendingPayout}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-center">
          <Button onClick={requestPayout} disabled={earnings.pendingPayout < 100} className="w-full">
            Request Payout
          </Button>
        </Card>
      </div>
    </div>
  );
}
