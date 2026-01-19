import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Deal {
  id: string;
  charter_name: string;
  original_price: number;
  discounted_price: number;
  discount_percentage: number;
  available_date: string;
  expires_at: string;
  location: string;
}

export default function LastMinuteDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    loadDeals();
    const interval = setInterval(loadDeals, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadDeals = async () => {
    try {
      const { data } = await supabase
        .from('last_minute_deals')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('discount_percentage', { ascending: false })
        .limit(6);
      
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const calculateTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m left` : minutes > 0 ? `${minutes}m left` : 'Expired';
  };


  if (deals.length === 0) return null;


  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold flex items-center text-gray-900">
            <TrendingDown className="w-8 h-8 mr-3 text-red-500" />
            Last-Minute Deals
          </h2>
          <Badge className="bg-red-500 text-white px-4 py-2 text-lg">Limited Time</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map(deal => (
            <Card key={deal.id} className="p-6 border-2 border-red-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white">
              <Badge className="mb-3 bg-red-500 text-lg">{deal.discount_percentage}% OFF</Badge>
              <h3 className="font-bold text-xl mb-2">{deal.charter_name}</h3>
              <p className="text-sm text-gray-600 mb-1">{deal.location}</p>
              <p className="text-sm text-gray-600 mb-3">Date: {new Date(deal.available_date).toLocaleDateString()}</p>
              <div className="flex items-center gap-3 my-3">
                <span className="text-3xl font-bold text-red-500">${deal.discounted_price}</span>
                <span className="text-xl line-through text-gray-400">${deal.original_price}</span>
              </div>
              <div className="flex items-center text-sm text-orange-600 mb-4 font-semibold">
                <Clock className="w-4 h-4 mr-2" />
                {calculateTimeLeft(deal.expires_at)}
              </div>
              <Button className="w-full bg-red-500 hover:bg-red-600 text-lg py-6">Book Now</Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


