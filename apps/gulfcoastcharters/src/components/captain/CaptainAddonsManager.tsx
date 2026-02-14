import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

const CATEGORIES = [
  { value: 'food', label: 'Food' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'tackle', label: 'Tackle' },
  { value: 'license', label: 'License' },
  { value: 'other', label: 'Other' },
];

export default function CaptainAddonsManager({ captainId }: { captainId?: string }) {
  const [addons, setAddons] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('equipment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/captain/addons', { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.addons)) setAddons(data.addons);
      else if (!res.ok) setError(data.error || 'Failed to load add-ons');
    } catch (e) {
      setError('Failed to load add-ons');
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!name || !price) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/captain/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description: description || undefined, price: parseFloat(price), category }),
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setDescription('');
        setPrice('');
        loadAddons();
      } else setError(data.error || 'Failed to add');
    } catch (e) {
      setError('Failed to add add-on');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/captain/addons?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) loadAddons();
      else setError(data.error || 'Failed to delete');
    } catch (e) {
      setError('Failed to delete');
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Manage Add-ons</h3>
      <p className="text-sm text-gray-600 mb-4">Offer fuel, tackle, catering, and more. Customers can add these when booking.</p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Input placeholder="Name (e.g., Beer 6-pack, Fuel top-up)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="border rounded px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Add-on category">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <Button onClick={handleAdd} className="mb-4" disabled={loading}><Plus className="w-4 h-4 mr-2" />Add Item</Button>
      {loading && !addons.length ? (
        <p className="text-gray-500">Loading add-ons...</p>
      ) : (
        <div className="space-y-2">
          {addons.map((addon) => (
            <div key={addon.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <p className="font-semibold">{addon.name} - ${Number(addon.price).toFixed(2)}</p>
                {addon.description && <p className="text-sm text-gray-600">{addon.description}</p>}
                {addon.category && addon.category !== 'other' && (
                  <span className="text-xs text-gray-400 capitalize">{addon.category}</span>
                )}
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(addon.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {addons.length === 0 && !loading && <p className="text-gray-500">No add-ons yet. Add fuel, tackle, or catering items above.</p>}
        </div>
      )}
    </Card>
  );
}
