import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface EarningsData {
  today: number;
  week: number;
  month: number;
  total: number;
  pending: number;
}

export default function MobileEarningsTracker() {
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    pending: 0
  });

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('price, status, date');

      if (data) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        setEarnings({
          today: data.filter(b => b.date === today && b.status === 'completed').reduce((sum, b) => sum + b.price, 0),
          week: data.filter(b => b.date >= weekAgo && b.status === 'completed').reduce((sum, b) => sum + b.price, 0),
          month: data.filter(b => b.date >= monthAgo && b.status === 'completed').reduce((sum, b) => sum + b.price, 0),
          total: data.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.price, 0),
          pending: data.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.price, 0)
        });
      }
    } catch (err) {
      console.error('Error loading earnings:', err);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm opacity-90">Total Earnings</p>
            <p className="text-4xl font-bold">${earnings.total.toLocaleString()}</p>
          </div>
          <DollarSign className="w-12 h-12 opacity-50" />
        </div>
        <p className="text-sm opacity-75 mt-2">+${earnings.pending.toLocaleString()} pending</p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Today</p>
          <p className="text-xl font-bold">${earnings.today}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">This Week</p>
          <p className="text-xl font-bold">${earnings.week}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">This Month</p>
          <p className="text-xl font-bold">${earnings.month}</p>
        </Card>
      </div>

      <Button variant="outline" className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Export Report
      </Button>
    </div>
  );
}
