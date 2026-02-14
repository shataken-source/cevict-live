import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Trash2 } from 'lucide-react';

interface PackingItem {
  id?: string;
  item_name: string;
  category: string;
  quantity: number;
  packed: boolean;
}

interface PackingListManagerProps {
  items: PackingItem[];
  onAdd: (item: PackingItem) => void;
  onToggle: (id: string, packed: boolean) => void;
  onRemove: (id: string) => void;
}

const CATEGORIES = ['Fishing Gear', 'Clothing', 'Personal Items', 'Food & Drinks', 'Safety', 'Electronics', 'Other'];

export default function PackingListManager({ items, onAdd, onToggle, onRemove }: PackingListManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: '', category: 'Fishing Gear', quantity: 1 });

  const handleAdd = () => {
    onAdd({ ...newItem, packed: false });
    setNewItem({ item_name: '', category: 'Fishing Gear', quantity: 1 });
    setShowForm(false);
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>);

  const packedCount = items.filter(i => i.packed).length;
  const progress = items.length > 0 ? (packedCount / items.length) * 100 : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Packing List</h3>
        </div>
        <Badge variant="secondary">{packedCount}/{items.length} packed</Badge>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {showForm && (
        <div className="space-y-3 mb-4 p-4 border rounded-lg">
          <Input
            value={newItem.item_name}
            onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
            placeholder="Item name"
          />
          <div className="flex gap-2">
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <Input
              type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
              className="w-20"
              min="1"
            />
          </div>
          <Button onClick={handleAdd} className="w-full">Add Item</Button>
        </div>
      )}

      <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm" className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" />
        {showForm ? 'Cancel' : 'Add Item'}
      </Button>

      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category}>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">{category}</h4>
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded-lg">
                  <Checkbox
                    checked={item.packed}
                    onCheckedChange={(checked) => item.id && onToggle(item.id, checked as boolean)}
                  />
                  <span className={`flex-1 ${item.packed ? 'line-through text-muted-foreground' : ''}`}>
                    {item.item_name} {item.quantity > 1 && `(x${item.quantity})`}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => item.id && onRemove(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
