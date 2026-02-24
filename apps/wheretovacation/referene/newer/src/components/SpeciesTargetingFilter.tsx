import { useState } from 'react';
import { Fish, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const fishSpecies = [
  { name: 'Red Snapper', season: 'Peak', catchRate: 92, icon: '🐟' },
  { name: 'Mahi Mahi', season: 'Good', catchRate: 85, icon: '🐠' },
  { name: 'Grouper', season: 'Peak', catchRate: 88, icon: '🐟' },
  { name: 'King Mackerel', season: 'Excellent', catchRate: 95, icon: '🐠' },
  { name: 'Tuna', season: 'Good', catchRate: 78, icon: '🐟' },
  { name: 'Tarpon', season: 'Fair', catchRate: 65, icon: '🐠' }
];

export default function SpeciesTargetingFilter() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSpecies = (name: string) => {
    setSelected(prev => 
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fish className="w-5 h-5 text-blue-600" />
          Target Species
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fishSpecies.map((species) => (
          <div key={species.name} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={selected.includes(species.name)}
                onCheckedChange={() => toggleSpecies(species.name)}
              />
              <span className="text-2xl">{species.icon}</span>
              <div>
                <p className="font-medium text-sm">{species.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-gray-600">{species.catchRate}% success rate</span>
                </div>
              </div>
            </div>
            <Badge variant={species.season === 'Peak' || species.season === 'Excellent' ? 'default' : 'secondary'}>
              {species.season}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
