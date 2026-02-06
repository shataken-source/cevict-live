import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Waves, Wind, Thermometer, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface BuoyData {
  stationId: string;
  station: string;
  waveHeightFt: number | null;
  wavePeriodS: number | null;
  windSpeedMph: number | null;
  windDirectionDeg: number | null;
  waterTempF: number | null;
  visibilityMi: number | null;
  timestamp: string;
  alerts?: Array<{ id: string; severity: string; event: string; headline?: string }>;
}

type Props = { stationId?: string; buoyId?: string };

export default function BuoyDataDisplay({ stationId, buoyId }: Props) {
  const id = String(stationId || buoyId || '').trim();
  const [data, setData] = useState<BuoyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    fetchBuoyData();
  }, [id]);

  const fetchBuoyData = async () => {
    try {
      if (!id) return;
      setUnavailable(false);
      const cached = localStorage.getItem(`buoy_${id}`);
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 300000) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      // Next.js API only (noaa-buoy-data Edge Function is not deployed)
      const apiRes = await fetch(`/api/noaa-buoy?action=get&stationId=${encodeURIComponent(id)}`);
      let resp: any = null;
      if (apiRes.ok) {
        resp = await apiRes.json();
      }

      if (!resp) {
        setData(null);
      } else {
        const obs = resp?.observation || {};
        const buoyData: BuoyData = {
          stationId: String(resp?.stationId || id),
          station: String(resp?.station || id),
          waveHeightFt: typeof obs.waveHeightFt === 'number' ? obs.waveHeightFt : null,
          wavePeriodS: typeof obs.wavePeriodS === 'number' ? obs.wavePeriodS : null,
          windSpeedMph: typeof obs.windSpeedMph === 'number' ? obs.windSpeedMph : null,
          windDirectionDeg: typeof obs.windDirectionDeg === 'number' ? obs.windDirectionDeg : null,
          waterTempF: typeof obs.waterTempF === 'number' ? obs.waterTempF : null,
          visibilityMi: typeof obs.visibilityMi === 'number' ? obs.visibilityMi : null,
          timestamp: String(obs.timestamp || new Date().toISOString()),
          alerts: Array.isArray(resp?.alerts) ? resp.alerts : [],
        };
        setData(buoyData);
        setUnavailable(Boolean(resp?.unavailable));
        localStorage.setItem(`buoy_${id}`, JSON.stringify({ data: buoyData, timestamp: Date.now() }));
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
      <h3 className="font-bold mb-3">NOAA Buoy {data.stationId}</h3>
      {unavailable && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          Data temporarily unavailable from NOAA for this station. Try another buoy or refresh later.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-blue-600" />
          <div>
            <div className="text-gray-600">Wave Height</div>
            <div className="font-semibold">{data.waveHeightFt ?? '—'}ft</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-blue-600" />
          <div>
            <div className="text-gray-600">Wind Speed</div>
            <div className="font-semibold">{data.windSpeedMph ?? '—'}mph</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-blue-600" />
          <div>
            <div className="text-gray-600">Water Temp</div>
            <div className="font-semibold">{data.waterTempF ?? '—'}°F</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <div>
            <div className="text-gray-600">Visibility</div>
            <div className="font-semibold">{data.visibilityMi ?? '—'}mi</div>
          </div>
        </div>
      </div>

      {data.alerts && data.alerts.length > 0 ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <div className="text-sm font-semibold text-red-900">Active marine alerts</div>
          <ul className="mt-2 space-y-1 text-xs text-red-800">
            {data.alerts.slice(0, 3).map((a) => (
              <li key={a.id}>
                <span className="font-semibold">{a.severity}:</span> {a.event}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
