import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fuel, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface FuelTrackerProps {
  boatId: string;
  fuelLogs: any[];
  onAdd: (data: any) => void;
}

export function FuelTracker({ boatId, fuelLogs, onAdd }: FuelTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '', gallons: '', cost_per_gallon: '', location: ''
  });

  const totalGallons = fuelLogs.reduce((sum, log) => sum + parseFloat(log.gallons || 0), 0);
  const totalCost = fuelLogs.reduce((sum, log) => sum + parseFloat(log.total_cost || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(formData.gallons) * parseFloat(formData.cost_per_gallon);
    onAdd({ ...formData, total_cost: total });
    setShowForm(false);
    setFormData({ date: '', gallons: '', cost_per_gallon: '', location: '' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Fuel Tracking</CardTitle>
          <Button onClick={() => setShowForm(!showForm)}>Log Fuel</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-blue-50 rounded">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Total Gallons</span>
            </div>
            <p className="text-2xl font-bold mt-2">{totalGallons.toFixed(1)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Total Cost</span>
            </div>
            <p className="text-2xl font-bold mt-2">${totalCost.toFixed(2)}</p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 border rounded space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div>
                <Label>Gallons</Label>
                <Input type="number" step="0.1" value={formData.gallons} onChange={(e) => setFormData({...formData, gallons: e.target.value})} required />
              </div>
              <div>
                <Label>Price/Gallon</Label>
                <Input type="number" step="0.01" value={formData.cost_per_gallon} onChange={(e) => setFormData({...formData, cost_per_gallon: e.target.value})} required />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
            </div>
            <Button type="submit">Add Log</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
