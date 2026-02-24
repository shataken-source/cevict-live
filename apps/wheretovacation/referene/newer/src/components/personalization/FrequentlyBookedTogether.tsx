import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Charter {
  id: string;
  title: string;
  price: number;
  image_url: string;
  location: string;
}

interface Props {
  charterId: string;
}

export default function FrequentlyBookedTogether({ charterId }: Props) {
  const [recommendations, setRecommendations] = useState<Charter[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selected, setSelected] = useState<string[]>([charterId]);
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, [charterId]);

  const loadRecommendations = async () => {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('charter_id, user_id')
      .eq('charter_id', charterId);

    if (!bookings) return;

    const userIds = bookings.map(b => b.user_id);
    
    const { data: otherBookings } = await supabase
      .from('bookings')
      .select('charter_id')
      .in('user_id', userIds)
      .neq('charter_id', charterId);

    const charterCounts = otherBookings?.reduce((acc: any, b) => {
      acc[b.charter_id] = (acc[b.charter_id] || 0) + 1;
      return acc;
    }, {});

    const topCharters = Object.entries(charterCounts || {})
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 2)
      .map(([id]) => id);

    const { data: charters } = await supabase
      .from('charters')
      .select('*')
      .in('id', topCharters);

    if (charters) {
      setRecommendations(charters);
      calculateTotal([charterId, ...charters.map(c => c.id)]);
    }
  };

  const calculateTotal = (ids: string[]) => {
    setSelected(ids);
    const total = ids.reduce((sum, id) => {
      const charter = recommendations.find(c => c.id === id);
      return sum + (charter?.price || 0);
    }, 0);
    setTotalPrice(total);
  };

  const toggleSelection = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id];
    calculateTotal(newSelected);
  };

  const addAllToCart = () => {
    toast({ title: `Added ${selected.length} charters to cart!` });
  };

  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequently Booked Together</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((charter, idx) => (
            <div key={charter.id} className="flex items-center gap-4">
              {idx > 0 && <Plus className="w-4 h-4 text-gray-400" />}
              <input
                type="checkbox"
                checked={selected.includes(charter.id)}
                onChange={() => toggleSelection(charter.id)}
                className="w-4 h-4"
              />
              <img src={charter.image_url} alt={charter.title} className="w-20 h-20 object-cover rounded" />
              <div className="flex-1">
                <h4 className="font-medium">{charter.title}</h4>
                <p className="text-sm text-gray-600">{charter.location}</p>
                <p className="font-semibold">${charter.price}</p>
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-blue-600">${totalPrice}</span>
            </div>
            <Button onClick={addAllToCart} className="w-full" size="lg">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add {selected.length} to Cart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}