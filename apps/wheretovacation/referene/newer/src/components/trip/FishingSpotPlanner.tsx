import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2 } from 'lucide-react';

interface FishingSpot {
  id?: string;
  day_number: number;
  spot_name: string;
  latitude?: number;
  longitude?: number;
  target_species: string[];
  notes: string;
}

interface FishingSpotPlannerProps {
  spots: FishingSpot[];
  totalDays: number;
  onAdd: (spot: FishingSpot) => void;
  onRemove: (id: string) => void;
}

export default function FishingSpotPlanner({ spots, totalDays, onAdd, onRemove }: FishingSpotPlannerProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FishingSpot>({
    day_number: 1,
    spot_name: '',
    target_species: [],
    notes: ''
  });

  const handleSubmit = () => {
    onAdd({ ...formData, day_number: selectedDay });
    setFormData({ day_number: selectedDay, spot_name: '', target_species: [], notes: '' });
    setShowForm(false);
  };

  const daySpots = spots.filter(s => s.day_number === selectedDay);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Fishing Spots</h3>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
          <Button
            key={day}
            variant={selectedDay === day ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDay(day)}
          >
            Day {day}
          </Button>
        ))}
      </div>

      {showForm && (
        <div className="space-y-4 mb-4 p-4 border rounded-lg">
          <div>
            <Label>Spot Name</Label>
            <Input
              value={formData.spot_name}
              onChange={(e) => setFormData({ ...formData, spot_name: e.target.value })}
              placeholder="North Reef"
            />
          </div>
          <div>
            <Label>Target Species (comma-separated)</Label>
            <Input
              value={formData.target_species.join(', ')}
              onChange={(e) => setFormData({ ...formData, target_species: e.target.value.split(',').map(s => s.trim()) })}
              placeholder="Tuna, Marlin, Mahi"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Best in morning, bring heavy tackle"
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">Add Spot</Button>
        </div>
      )}

      <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm" className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" />
        {showForm ? 'Cancel' : `Add Spot for Day ${selectedDay}`}
      </Button>

      <div className="space-y-2">
        {daySpots.map((spot) => (
          <div key={spot.id} className="p-3 border rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium">{spot.spot_name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {spot.target_species.map((species, idx) => (
                    <Badge key={idx} variant="secondary">{species}</Badge>
                  ))}
                </div>
                {spot.notes && <p className="text-sm text-muted-foreground mt-2">{spot.notes}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => spot.id && onRemove(spot.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
