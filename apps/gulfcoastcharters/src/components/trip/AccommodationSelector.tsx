import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Hotel, Trash2 } from 'lucide-react';

interface Accommodation {
  id?: string;
  name: string;
  address: string;
  check_in_date: Date;
  check_out_date: Date;
  cost: number;
  booking_url: string;
  notes: string;
}

interface AccommodationSelectorProps {
  accommodations: Accommodation[];
  onAdd: (accommodation: Accommodation) => void;
  onRemove: (id: string) => void;
}

export default function AccommodationSelector({ accommodations, onAdd, onRemove }: AccommodationSelectorProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Accommodation>({
    name: '',
    address: '',
    check_in_date: new Date(),
    check_out_date: new Date(),
    cost: 0,
    booking_url: '',
    notes: ''
  });

  const handleSubmit = () => {
    onAdd(formData);
    setFormData({
      name: '',
      address: '',
      check_in_date: new Date(),
      check_out_date: new Date(),
      cost: 0,
      booking_url: '',
      notes: ''
    });
    setShowForm(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Hotel className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Accommodations</h3>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm">
          {showForm ? 'Cancel' : 'Add Hotel'}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-4 mb-4 p-4 border rounded-lg">
          <div>
            <Label>Hotel Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Seaside Resort"
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Ocean Ave"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cost per Night</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Booking URL</Label>
              <Input
                value={formData.booking_url}
                onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full">Add Accommodation</Button>
        </div>
      )}

      <div className="space-y-2">
        {accommodations.map((acc) => (
          <div key={acc.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{acc.name}</p>
              <p className="text-sm text-muted-foreground">{acc.address}</p>
              <p className="text-sm">${acc.cost}/night</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => acc.id && onRemove(acc.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
