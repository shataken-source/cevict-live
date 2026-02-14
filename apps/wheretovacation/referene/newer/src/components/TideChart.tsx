import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface TideData {
  time: string;
  height: number;
  type: 'High' | 'Low';
}

export function TideChart({ stationId }: { stationId: string }) {
  const [tides, setTides] = useState<TideData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTideData();
  }, [stationId]);

  const fetchTideData = async () => {
    try {
      const cached = localStorage.getItem(`tide_${stationId}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 3600000) {
          setTides(data);
          setLoading(false);
          return;
        }
      }

      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
      
      const response = await fetch(url);
      const json = await response.json();
      
      const tideData = json.predictions?.slice(0, 4).map((t: any) => ({
        time: new Date(t.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        height: parseFloat(t.v),
        type: t.type === 'H' ? 'High' : 'Low'
      })) || [];

      setTides(tideData);
      localStorage.setItem(`tide_${stationId}`, JSON.stringify({ data: tideData, timestamp: Date.now() }));
    } catch (error) {
      toast.error('Failed to load tide data');
    }
    setLoading(false);
  };

  if (loading) return <Card className="p-4">Loading tide data...</Card>;

  return (
    <Card className="p-4">
      <h3 className="font-bold mb-3">Today's Tides</h3>
      <div className="space-y-2">
        {tides.map((tide, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <div className="flex items-center gap-2">
              {tide.type === 'High' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-gray-600" />}
              <span className="font-semibold">{tide.type} Tide</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">{tide.time}</div>
              <div className="text-sm text-gray-600">{tide.height.toFixed(1)}ft</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
