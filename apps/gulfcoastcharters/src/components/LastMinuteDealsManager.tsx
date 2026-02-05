import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface LastMinuteDeal {
  id: string;
  charter_id: string;
  charter_name: string;
  original_price: number;
  discounted_price: number;
  discount_percentage: number;
  available_date: string;
  expires_at: string;
  location: string;
  captain_id: string;
}

export default function LastMinuteDealsManager({ captainId }: { captainId: string }) {
  const [deals, setDeals] = useState<LastMinuteDeal[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    charter_name: '',
    original_price: '',
    discounted_price: '',
    available_date: '',
    expires_at: '',
    location: ''
  });

  useEffect(() => {
    loadDeals();
  }, [captainId]);

  const loadDeals = async () => {
    try {
      const { data } = await supabase
        .from('last_minute_deals')
        .select('*')
        .eq('captain_id', captainId)
        .order('created_at', { ascending: false });
      
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const handleCreate = async () => {
    const discountPercentage = Math.round(
      ((parseFloat(formData.original_price) - parseFloat(formData.discounted_price)) / 
      parseFloat(formData.original_price)) * 100
    );

    try {
      const { data: newDeal, error } = await supabase.from('last_minute_deals').insert({
        captain_id: captainId,
        charter_name: formData.charter_name,
        original_price: parseFloat(formData.original_price),
        discounted_price: parseFloat(formData.discounted_price),
        discount_percentage: discountPercentage,
        available_date: formData.available_date,
        expires_at: formData.expires_at,
        location: formData.location
      }).select().single();

      if (error) throw error;
      
      // Trigger notification system
      await supabase.functions.invoke('deal-alert-notifications', {
        body: {
          dealId: newDeal.id,
          dealData: {
            charterName: formData.charter_name,
            location: formData.location,
            discount: discountPercentage,
            originalPrice: formData.original_price,
            dealPrice: formData.discounted_price,
            endDate: formData.expires_at,
            description: `Last-minute deal on ${formData.charter_name}`
          }
        }
      });
      
      toast.success('Last-minute deal created and notifications sent!');
      setShowCreateModal(false);
      setFormData({ charter_name: '', original_price: '', discounted_price: '', available_date: '', expires_at: '', location: '' });
      loadDeals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create deal');
    }
  };


  const handleDelete = async (dealId: string) => {
    try {
      const { error } = await supabase.from('last_minute_deals').delete().eq('id', dealId);
      if (error) throw error;
      toast.success('Deal deleted');
      loadDeals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete deal');
    }
  };

  const calculateTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 0 ? `${hours}h left` : 'Expired';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Last-Minute Deals</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Deal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map(deal => (
          <Card key={deal.id} className="p-4 border-2 border-red-500">
            <div className="flex justify-between items-start mb-2">
              <Badge className="bg-red-500">{deal.discount_percentage}% OFF</Badge>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(deal.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <h3 className="font-bold text-lg">{deal.charter_name}</h3>
            <p className="text-sm text-gray-600">{deal.location}</p>
            <p className="text-sm text-gray-600">Date: {new Date(deal.available_date).toLocaleDateString()}</p>
            <div className="flex items-center gap-2 my-2">
              <span className="text-2xl font-bold text-red-500">${deal.discounted_price}</span>
              <span className="text-lg line-through text-gray-400">${deal.original_price}</span>
            </div>
            <div className="flex items-center text-sm text-orange-600">
              <Clock className="w-4 h-4 mr-1" />
              {calculateTimeLeft(deal.expires_at)}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Last-Minute Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Charter Name</Label>
              <Input value={formData.charter_name} onChange={(e) => setFormData({...formData, charter_name: e.target.value})} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Original Price</Label>
                <Input type="number" value={formData.original_price} onChange={(e) => setFormData({...formData, original_price: e.target.value})} />
              </div>
              <div>
                <Label>Discounted Price</Label>
                <Input type="number" value={formData.discounted_price} onChange={(e) => setFormData({...formData, discounted_price: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Available Date</Label>
              <Input type="date" value={formData.available_date} onChange={(e) => setFormData({...formData, available_date: e.target.value})} />
            </div>
            <div>
              <Label>Deal Expires At</Label>
              <Input type="datetime-local" value={formData.expires_at} onChange={(e) => setFormData({...formData, expires_at: e.target.value})} />
            </div>
            <Button onClick={handleCreate} className="w-full">Create Deal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
