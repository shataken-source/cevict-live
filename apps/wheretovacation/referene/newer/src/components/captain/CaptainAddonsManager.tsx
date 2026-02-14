import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Trash2, Plus } from 'lucide-react';

export default function CaptainAddonsManager({ captainId }: { captainId: string }) {
  const [addons, setAddons] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('food');

  useEffect(() => {
    loadAddons();
  }, [captainId]);

  const loadAddons = async () => {
    const { data } = await supabase.functions.invoke('captain-addons-manager', {
      body: { action: 'list', captainId }
    });
    if (data?.addons) setAddons(data.addons);
  };

  const handleAdd = async () => {
    if (!name || !price) return;
    await supabase.functions.invoke('captain-addons-manager', {
      body: { action: 'create', captainId, addon: { name, description, price: parseFloat(price), category } }
    });
    setName(''); setDescription(''); setPrice('');
    loadAddons();
  };

  const handleDelete = async (id: string) => {
    await supabase.functions.invoke('captain-addons-manager', {
      body: { action: 'delete', captainId, addon: { id } }
    });
    loadAddons();
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Manage Add-ons</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Input placeholder="Name (e.g., Beer 6-pack)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="border rounded px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="food">Food</option>
          <option value="beverage">Beverage</option>
          <option value="equipment">Equipment</option>
          <option value="other">Other</option>
        </select>
      </div>
      <Button onClick={handleAdd} className="mb-4"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
      <div className="space-y-2">
        {addons.map(addon => (
          <div key={addon.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <div>
              <p className="font-semibold">{addon.name} - ${addon.price}</p>
              <p className="text-sm text-gray-600">{addon.description}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(addon.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
