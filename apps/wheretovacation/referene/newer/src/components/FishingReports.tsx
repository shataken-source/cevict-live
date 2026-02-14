import { useState } from 'react';
import { MapPin, Cloud, Wind, Waves, TrendingUp, Fish } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FishingReport {
  id: string;
  location: string;
  userName: string;
  timeAgo: string;
  conditions: 'excellent' | 'good' | 'fair' | 'poor';
  waterTemp: string;
  windSpeed: string;
  waveHeight: string;
  fishCaught: string[];
  baitUsed: string;
  notes: string;
}

const mockReports: FishingReport[] = [
  {
    id: '1',
    location: 'Destin, FL - East Pass',
    userName: 'Capt. Mike',
    timeAgo: '1 hour ago',
    conditions: 'excellent',
    waterTemp: '78°F',
    windSpeed: '5-10 mph',
    waveHeight: '1-2 ft',
    fishCaught: ['Red Snapper', 'Grouper', 'Amberjack'],
    baitUsed: 'Live bait, squid',
    notes: 'Great bite this morning! Fish are active around the wrecks.'
  },
  {
    id: '2',
    location: 'Key West, FL - Offshore',
    userName: 'Capt. Rodriguez',
    timeAgo: '3 hours ago',
    conditions: 'good',
    waterTemp: '82°F',
    windSpeed: '10-15 mph',
    waveHeight: '2-3 ft',
    fishCaught: ['Mahi-Mahi', 'Wahoo', 'Tuna'],
    baitUsed: 'Trolling lures',
    notes: 'Mahi schools are thick! Look for floating debris.'
  },
  {
    id: '3',
    location: 'Galveston, TX - Jetties',
    userName: 'Capt. Steve',
    timeAgo: '5 hours ago',
    conditions: 'good',
    waterTemp: '76°F',
    windSpeed: '8-12 mph',
    waveHeight: '1-2 ft',
    fishCaught: ['Redfish', 'Speckled Trout', 'Flounder'],
    baitUsed: 'Shrimp, soft plastics',
    notes: 'Inshore bite is solid. Early morning was best.'
  }
];

const conditionColors = {
  excellent: 'bg-green-500',
  good: 'bg-blue-500',
  fair: 'bg-yellow-500',
  poor: 'bg-red-500'
};

export default function FishingReports() {
  const [reports] = useState(mockReports);

  return (
    <div className="space-y-4">
      {reports.map(report => (
        <Card key={report.id} className="p-6 hover:shadow-lg transition">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold">{report.location}</h3>
              </div>
              <div className="text-sm text-gray-500">
                by {report.userName} • {report.timeAgo}
              </div>
            </div>
            <Badge className={`${conditionColors[report.conditions]} text-white`}>
              {report.conditions.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Cloud className="w-4 h-4 text-gray-500" />
              <span>{report.waterTemp}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wind className="w-4 h-4 text-gray-500" />
              <span>{report.windSpeed}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Waves className="w-4 h-4 text-gray-500" />
              <span>{report.waveHeight}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-semibold">Active</span>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Fish className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm">Species Caught:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.fishCaught.map(fish => (
                <Badge key={fish} variant="outline">{fish}</Badge>
              ))}
            </div>
          </div>

          <div className="mb-3 text-sm">
            <span className="font-semibold">Bait: </span>
            <span className="text-gray-600">{report.baitUsed}</span>
          </div>

          <p className="text-gray-700 italic bg-blue-50 p-3 rounded-lg">
            "{report.notes}"
          </p>
        </Card>
      ))}
    </div>
  );
}
