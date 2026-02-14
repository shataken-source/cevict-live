import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface EquipmentInventoryProps {
  boatId: string;
  equipment: any[];
  onAdd: (data: any) => void;
}

export function EquipmentInventory({ boatId, equipment, onAdd }: EquipmentInventoryProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '', category: 'Safety', quantity: '1', condition: 'Good', expiration_date: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setShowForm(false);
    setFormData({ item_name: '', category: 'Safety', quantity: '1', condition: 'Good', expiration_date: '' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Equipment Inventory</CardTitle>
          <Button onClick={() => setShowForm(!showForm)}>Add Item</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 border rounded space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Item Name</Label>
                <Input value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})} required />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
              </div>
              <div>
                <Label>Expiration Date</Label>
                <Input type="date" value={formData.expiration_date} onChange={(e) => setFormData({...formData, expiration_date: e.target.value})} />
              </div>
            </div>
            <Button type="submit">Add Equipment</Button>
          </form>
        )}
        
        <div className="space-y-2">
          {equipment.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5" />
                <div>
                  <p className="font-medium">{item.item_name}</p>
                  <p className="text-sm text-muted-foreground">{item.category} • Qty: {item.quantity}</p>
                </div>
              </div>
              <Badge>{item.condition}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
