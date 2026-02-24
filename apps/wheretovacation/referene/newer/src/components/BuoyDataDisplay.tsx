import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Waves, Wind, Thermometer, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface BuoyData {
  station: string;
  waveHeight: number;
  wavePeriod: number;
  windSpeed: number;
  windDirection: string;
  waterTemp: number;
  visibility: number;
  timestamp: string;
}

export function BuoyDataDisplay({ stationId }: { stationId: string }) {
  const [data, setData] = useState<BuoyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuoyData();
  }, [stationId]);

  const fetchBuoyData = async () => {
    try {
      const cached = localStorage.getItem(`buoy_${stationId}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 1800000) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`);
      const text = await response.text();
      const lines = text.split('\n');
      const dataLine = lines[2]?.split(/\s+/);

      if (dataLine) {
        const buoyData: BuoyData = {
          station: stationId,
          waveHeight: parseFloat(dataLine[8]) || 0,
          wavePeriod: parseFloat(dataLine[9]) || 0,
          windSpeed: parseFloat(dataLine[6]) || 0,
          windDirection: dataLine[5] || 'N/A',
          waterTemp: parseFloat(dataLine[14]) || 0,
          visibility: parseFloat(dataLine[13]) || 10,
          timestamp: new Date().toISOString()
        };

        setData(buoyData);
        localStorage.setItem(`buoy_${stationId}`, JSON.stringify({ data: buoyData, timestamp: Date.now() }));
      }
    } catch (error) {
      toast.error('Failed to load buoy data');
    }
    setLoading(false);
  };

  if (loading) return <Card className="p-4">Loading buoy data...</Card>;
  if (!data) return <Card className="p-4">No data available</Card>;

  return (
    <Card className="p-4">
      <h3 className="font-bold mb-3">NOAA Buoy {data.station}</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-blue-600" />
          <div><div className="text-gray-600">Wave Height</div><div className="font-semibold">{data.waveHeight}ft</div></div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-blue-600" />
          <div><div className="text-gray-600">Wind Speed</div><div className="font-semibold">{data.windSpeed}mph</div></div>
        </div>
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-blue-600" />
          <div><div className="text-gray-600">Water Temp</div><div className="font-semibold">{data.waterTemp}°F</div></div>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <div><div className="text-gray-600">Visibility</div><div className="font-semibold">{data.visibility}mi</div></div>
        </div>
      </div>
    </Card>
  );
}
