import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface BoatProfileProps {
  boat?: any;
  onSave: (data: any) => void;
}

export function BoatProfile({ boat, onSave }: BoatProfileProps) {
  const [formData, setFormData] = useState(boat || {
    name: '', boat_type: '', manufacturer: '', year: '', length_feet: '',
    passenger_capacity: '', engine_make: '', engine_hours: '', registration_number: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{boat ? 'Edit Boat' : 'Add New Boat'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Boat Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
              <Label>Type</Label>
              <Input value={formData.boat_type} onChange={(e) => setFormData({...formData, boat_type: e.target.value})} />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} />
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} />
            </div>
            <div>
              <Label>Length (ft)</Label>
              <Input type="number" value={formData.length_feet} onChange={(e) => setFormData({...formData, length_feet: e.target.value})} />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={formData.passenger_capacity} onChange={(e) => setFormData({...formData, passenger_capacity: e.target.value})} />
            </div>
          </div>
          <Button type="submit" className="w-full">Save Boat</Button>
        </form>
      </CardContent>
    </Card>
  );
}
