import { Clock, TrendingDown, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const deals = [
  { id: 1, destination: 'Bali, Indonesia', discount: 45, price: 899, original: 1635, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256643592_349a9611.webp', expires: '2 days' },
  { id: 2, destination: 'Santorini, Greece', discount: 35, price: 1299, original: 1999, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256645589_0c6078bc.webp', expires: '5 days' },
  { id: 3, destination: 'Tokyo, Japan', discount: 30, price: 1499, original: 2141, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256647520_475938e6.webp', expires: '3 days' },
  { id: 4, destination: 'Maldives', discount: 50, price: 1799, original: 3598, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256649424_d1863448.webp', expires: '1 day' },
  { id: 5, destination: 'Paris, France', discount: 25, price: 999, original: 1332, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256651342_9b04894d.webp', expires: '4 days' },
  { id: 6, destination: 'Dubai, UAE', discount: 40, price: 1199, original: 1998, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256653292_eca2c035.webp', expires: '6 days' },
];

export default function SeasonalDeals() {
  return (
    <div className="py-16 bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-bold mb-2">Seasonal Deals</h2>
            <p className="text-gray-600">Limited time offers - Book now and save big!</p>
          </div>
          <Button className="gap-2"><Bell className="w-4 h-4" />Set Price Alert</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {deals.map(deal => (
            <div key={deal.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition group">
              <div className="relative">
                <img src={deal.image} alt={deal.destination} className="w-full h-48 object-cover" />
                <Badge className="absolute top-4 right-4 bg-red-500 text-white text-lg px-3 py-1">
                  -{deal.discount}%
                </Badge>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold">{deal.expires} left</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-xl mb-3">{deal.destination}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-green-600">${deal.price}</span>
                  <span className="text-gray-400 line-through">${deal.original}</span>
                </div>
                <Button className="w-full group-hover:bg-orange-600">Book Now</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}