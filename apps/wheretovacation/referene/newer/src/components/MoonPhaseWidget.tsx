import { Moon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MoonPhaseWidget() {
  const moonPhases = [
    { date: 'Today', phase: 'Waxing Gibbous', illumination: 78, fishActivity: 'High' },
    { date: 'Tomorrow', phase: 'Waxing Gibbous', illumination: 85, fishActivity: 'High' },
    { date: 'Nov 19', phase: 'Full Moon', illumination: 100, fishActivity: 'Peak' },
    { date: 'Nov 20', phase: 'Waning Gibbous', illumination: 97, fishActivity: 'High' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-600" />
          Moon Phase Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {moonPhases.map((day, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <Moon className="w-5 h-5" style={{ opacity: day.illumination / 100 }} />
                </div>
                <div>
                  <p className="font-medium text-sm">{day.date}</p>
                  <p className="text-xs text-gray-600">{day.phase}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{day.illumination}% lit</p>
                <span className={`text-xs font-medium ${
                  day.fishActivity === 'Peak' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {day.fishActivity} Activity
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
