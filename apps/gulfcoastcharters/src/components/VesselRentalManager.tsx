import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Anchor, Upload, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VesselRentalManager() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    vesselName: '',
    vesselType: '',
    capacity: '',
    hourlyRate: '',
    dailyRate: '',
    description: '',
    location: '',
    amenities: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: '⚓ Vessel listed successfully!' });
    setFormData({
      vesselName: '', vesselType: '', capacity: '', hourlyRate: '',
      dailyRate: '', description: '', location: '', amenities: ''
    });
  };

  return (
    <Card className="border-2 border-cyan-200 shadow-lg shadow-blue-100/50">
      <CardHeader className="bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-500 text-white">
        <CardTitle className="flex items-center gap-2">
          <Anchor className="w-6 h-6" />
          List Your Vessel for Rent
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Vessel Name</Label>
              <Input value={formData.vesselName} onChange={(e) => setFormData({...formData, vesselName: e.target.value})} required />
            </div>
            <div>
              <Label>Vessel Type</Label>
              <Select value={formData.vesselType} onValueChange={(v) => setFormData({...formData, vesselType: v})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sailboat">Sailboat</SelectItem>
                  <SelectItem value="yacht">Yacht</SelectItem>
                  <SelectItem value="fishing">Fishing Boat</SelectItem>
                  <SelectItem value="pontoon">Pontoon</SelectItem>
                  <SelectItem value="jetski">Jet Ski</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} required />
            </div>
            <div>
              <Label>Hourly Rate ($)</Label>
              <Input type="number" value={formData.hourlyRate} onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})} />
            </div>
            <div>
              <Label>Daily Rate ($)</Label>
              <Input type="number" value={formData.dailyRate} onChange={(e) => setFormData({...formData, dailyRate: e.target.value})} />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
          </div>

          <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
            <Upload className="w-4 h-4 mr-2" />
            List Vessel
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
