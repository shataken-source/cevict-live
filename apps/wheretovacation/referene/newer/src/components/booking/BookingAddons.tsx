import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'license' | 'equipment' | 'catering';
}

const AVAILABLE_ADDONS: Addon[] = [
  { id: 'fl-license', name: 'Florida Fishing License (1-day)', price: 17, description: 'Required for fishing', category: 'license' },
  { id: 'fl-license-3', name: 'Florida Fishing License (3-day)', price: 30, description: 'Valid for 3 days', category: 'license' },
  { id: 'rod-reel', name: 'Premium Rod & Reel', price: 25, description: 'High-quality fishing gear', category: 'equipment' },
  { id: 'tackle-box', name: 'Tackle Box Set', price: 35, description: 'Complete tackle assortment', category: 'equipment' },
  { id: 'cooler', name: 'Ice Cooler', price: 15, description: 'Keep your catch fresh', category: 'equipment' },
  { id: 'lunch', name: 'Lunch Package', price: 20, description: 'Sandwiches, snacks, drinks', category: 'catering' },
  { id: 'snacks', name: 'Snack & Beverage Pack', price: 12, description: 'Chips, sodas, water', category: 'catering' },
  { id: 'premium-meal', name: 'Premium Catering', price: 45, description: 'Gourmet lunch for group', category: 'catering' },
];

interface BookingAddonsProps {
  selectedAddons: string[];
  onAddonsChange: (addons: string[]) => void;
}

export default function BookingAddons({ selectedAddons, onAddonsChange }: BookingAddonsProps) {
  const toggleAddon = (addonId: string) => {
    if (selectedAddons.includes(addonId)) {
      onAddonsChange(selectedAddons.filter(id => id !== addonId));
    } else {
      onAddonsChange([...selectedAddons, addonId]);
    }
  };

  const categories = ['license', 'equipment', 'catering'] as const;

  return (
    <div className="space-y-6">
      {categories.map(category => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
          <div className="grid gap-3">
            {AVAILABLE_ADDONS.filter(a => a.category === category).map(addon => (
              <Card key={addon.id} className="p-4 hover:border-blue-500 transition cursor-pointer"
                onClick={() => toggleAddon(addon.id)}>
                <div className="flex items-start gap-3">
                  <Checkbox checked={selectedAddons.includes(addon.id)} 
                    onCheckedChange={() => toggleAddon(addon.id)} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer">{addon.name}</Label>
                      <Badge variant="secondary">${addon.price}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{addon.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { AVAILABLE_ADDONS };
