import { Sun, Moon, Fish } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrimeTimesWidget() {
  const primeSlots = [
    { time: '5:30 AM - 8:30 AM', type: 'sunrise', activity: 'Peak Feeding', quality: 'Excellent' },
    { time: '6:00 PM - 8:30 PM', type: 'sunset', activity: 'Evening Bite', quality: 'Very Good' },
    { time: '11:00 AM - 2:00 PM', type: 'midday', activity: 'Offshore Action', quality: 'Good' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fish className="w-5 h-5 text-blue-600" />
          Prime Fishing Times Today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {primeSlots.map((slot, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {slot.type === 'sunrise' && <Sun className="w-5 h-5 text-orange-500" />}
              {slot.type === 'sunset' && <Sun className="w-5 h-5 text-red-500" />}
              {slot.type === 'midday' && <Moon className="w-5 h-5 text-gray-400" />}
              <div>
                <p className="font-semibold text-sm">{slot.time}</p>
                <p className="text-xs text-gray-600">{slot.activity}</p>
              </div>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              slot.quality === 'Excellent' ? 'bg-green-100 text-green-700' :
              slot.quality === 'Very Good' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {slot.quality}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
