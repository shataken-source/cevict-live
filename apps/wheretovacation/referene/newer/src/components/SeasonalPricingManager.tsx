import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Trash2, Plus } from 'lucide-react';

interface SeasonalPrice {
  id: string;
  season_name: string;
  start_date: string;
  end_date: string;
  price_multiplier: number;
  custom_price?: number;
  active: boolean;
}

export default function SeasonalPricingManager({ captainId }: { captainId: string }) {
  const [seasons, setSeasons] = useState<SeasonalPrice[]>([]);
  const [seasonName, setSeasonName] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [multiplier, setMultiplier] = useState('1.5');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSeasons();
  }, [captainId]);

  const loadSeasons = async () => {
    try {
      const { data } = await supabase
        .from('seasonal_pricing')
        .select('*')
        .eq('captain_id', captainId)
        .order('start_date');

      if (data) setSeasons(data);
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const addSeason = async () => {
    if (!seasonName || !startDate || !endDate) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('availability-manager', {
        body: {
          action: 'addSeasonalPricing',
          captainId,
          seasonName,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          priceMultiplier: parseFloat(multiplier)
        }
      });

      if (error) throw error;
      
      toast.success('Seasonal pricing added');
      setSeasonName('');
      setStartDate(undefined);
      setEndDate(undefined);
      setMultiplier('1.5');
      loadSeasons();
    } catch (error: any) {
      toast.error('Failed to add seasonal pricing');
    } finally {
      setLoading(false);
    }
  };

  const removeSeason = async (id: string) => {
    try {
      const { error } = await supabase
        .from('seasonal_pricing')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Season removed');
      loadSeasons();
    } catch (error) {
      toast.error('Failed to remove season');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Seasonal Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Season Name</Label>
            <Input
              placeholder="e.g., Summer Peak, Holiday Season"
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                className="rounded-md border"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                className="rounded-md border"
              />
            </div>
          </div>

          <div>
            <Label>Price Multiplier (e.g., 1.5 = 50% increase)</Label>
            <Input
              type="number"
              step="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
            />
          </div>

          <Button onClick={addSeason} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Seasonal Pricing
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Seasonal Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {seasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No seasonal pricing configured</p>
            ) : (
              seasons.map((season) => (
                <div key={season.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-semibold">{season.season_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                    </div>
                    <Badge variant="secondary" className="mt-1">
                      {season.price_multiplier}x multiplier
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSeason(season.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}