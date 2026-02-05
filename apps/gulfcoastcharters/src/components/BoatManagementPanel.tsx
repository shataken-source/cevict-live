import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import SMSVerificationModal from './SMSVerificationModal';
import { Shield, Plus, Edit } from 'lucide-react';

interface Boat {
  id: string;
  name: string;
  type: string;
  capacity: number;
  price: number;
  description: string;
  verified: boolean;
}

export default function BoatManagementPanel({ captainEmail }: { captainEmail: string }) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    capacity: '',
    price: '',
    description: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase.functions.invoke('captain-auth', {
        body: {
          action: 'addBoat',
          email: captainEmail,
          phone: formData.phone,
          boatInfo: {
            name: formData.name,
            type: formData.type,
            capacity: parseInt(formData.capacity),
            price: parseFloat(formData.price),
            description: formData.description
          }
        }
      });

      if (error) throw error;

      if (data.requiresVerification) {
        setPhoneNumber(formData.phone);
        setShowVerification(true);
        toast.success('Boat added! Please verify your phone.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add boat');
    }
  };

  const handleVerified = () => {
    toast.success('Boat verified! Your listing is now active.');
    setShowAddForm(false);
    setFormData({ name: '', type: '', capacity: '', price: '', description: '', phone: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Boats</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Boat
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Add New Boat</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Boat Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Boat Type *</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="e.g., Fishing Charter, Yacht"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price per Day *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Contact Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="For SMS verification"
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit">Add Boat</Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <SMSVerificationModal
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
        email={captainEmail}
        captainEmail={captainEmail}
        onVerified={handleVerified}
      />

    </div>
  );
}