import { Hotel, Ship, Calendar, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PackageBundle {
  id: string;
  name: string;
  description: string;
  includes: string[];
  price: number;
  originalPrice: number;
  duration: string;
  maxGuests: number;
  image: string;
}

export default function PackageBundleCard({ bundle }: { bundle: PackageBundle }) {
  const savings = bundle.originalPrice - bundle.price;
  const savingsPercent = Math.round((savings / bundle.originalPrice) * 100);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition">
      <div className="relative">
        <img src={bundle.image} alt={bundle.name} className="w-full h-48 object-cover" />
        <Badge className="absolute top-3 right-3 bg-green-600">
          Save {savingsPercent}%
        </Badge>
      </div>
      <CardHeader>
        <CardTitle className="text-xl">{bundle.name}</CardTitle>
        <p className="text-sm text-gray-600">{bundle.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {bundle.includes.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {item.includes('hotel') && <Hotel className="w-4 h-4 text-blue-600" />}
              {item.includes('charter') && <Ship className="w-4 h-4 text-blue-600" />}
              {item.includes('meal') && <Calendar className="w-4 h-4 text-blue-600" />}
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            {bundle.duration}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            Up to {bundle.maxGuests}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between bg-gray-50">
        <div>
          <p className="text-sm text-gray-500 line-through">${bundle.originalPrice}</p>
          <p className="text-2xl font-bold text-blue-600">${bundle.price}</p>
        </div>
        <Button>Book Package</Button>
      </CardFooter>
    </Card>
  );
}
