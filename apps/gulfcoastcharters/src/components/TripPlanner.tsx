import { useState } from 'react';
import { Plus, Trash2, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function TripPlanner() {
  const [tripName, setTripName] = useState('');
  const [destinations, setDestinations] = useState<any[]>([]);
  const [newDest, setNewDest] = useState({ name: '', days: 1, cost: 0 });

  const addDestination = () => {
    if (newDest.name) {
      setDestinations([...destinations, { ...newDest, id: Date.now() }]);
      setNewDest({ name: '', days: 1, cost: 0 });
    }
  };

  const removeDest = (id: number) => {
    setDestinations(destinations.filter(d => d.id !== id));
  };

  const totalDays = destinations.reduce((sum, d) => sum + d.days, 0);
  const totalCost = destinations.reduce((sum, d) => sum + d.cost, 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Trip Planner</h2>
      
      <Input placeholder="Trip Name" value={tripName} 
        onChange={(e) => setTripName(e.target.value)} className="mb-6" />

      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4">Add Destination</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Input placeholder="Destination" value={newDest.name}
            onChange={(e) => setNewDest({...newDest, name: e.target.value})} />
          <Input type="number" placeholder="Days" value={newDest.days}
            onChange={(e) => setNewDest({...newDest, days: parseInt(e.target.value) || 1})} />
          <Input type="number" placeholder="Cost ($)" value={newDest.cost}
            onChange={(e) => setNewDest({...newDest, cost: parseFloat(e.target.value) || 0})} />
        </div>
        <Button onClick={addDestination}><Plus className="w-4 h-4 mr-2" />Add</Button>
      </Card>

      <div className="space-y-4 mb-6">
        {destinations.map(dest => (
          <Card key={dest.id} className="p-4 flex justify-between items-center">
            <div>
              <h4 className="font-semibold">{dest.name}</h4>
              <p className="text-sm text-gray-600">{dest.days} days • ${dest.cost}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => removeDest(dest.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-blue-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span className="font-semibold">Total: {totalDays} days</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <span className="font-semibold">${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}