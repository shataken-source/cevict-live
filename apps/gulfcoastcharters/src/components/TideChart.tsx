import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

interface TideData {
  time: string;
  height: number;
  type: 'High' | 'Low';
}

type TideChartProps = {
  /**
   * NOAA tide station id (preferred). Example: "8729840".
   */
  stationId?: string;
  /**
   * Human-readable location; used only to best-effort map to a station id.
   */
  location?: string;
};

function normalizeStationId(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  // Extract a 7+ digit station id if present in the string.
  const match = s.match(/\b(\d{7,})\b/);
  if (match?.[1]) return match[1];
  // If the whole value is numeric (but short), still allow it.
  if (/^\d+$/.test(s)) return s;
  return null;
}

function stationIdFromLocation(location?: string | null): string | null {
  const l = String(location || '').toLowerCase();
  if (!l) return null;

  // Best-effort Gulf Coast defaults. If we can't confidently map, return null.
  // Source: common NOAA CO-OPS station ids.
  if (l.includes('pensacola')) return '8729840';
  if (l.includes('destin')) return '8729511';
  if (l.includes('panama')) return '8729108';
  if (l.includes('mobile')) return '8737048';
  if (l.includes('dauphin')) return '8735180';
  if (l.includes('orange beach') || l.includes('orange-beach')) return '8735180';

  return null;
}

export function TideChart({ stationId, location }: TideChartProps) {
  const resolvedStationId = useMemo(() => {
    return normalizeStationId(stationId) ?? normalizeStationId(location) ?? stationIdFromLocation(location);
  }, [stationId, location]);

  const [tides, setTides] = useState<TideData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      if (!resolvedStationId) {
        setTides([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const cached = localStorage.getItem(`tide_${resolvedStationId}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 3600000) {
            setTides(data);
            setLoading(false);
            return;
          }
        }

        const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station=${resolvedStationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json`;

        const response = await fetch(url);
        const json = await response.json();

        const tideData =
          json.predictions?.slice(0, 4).map((t: any) => ({
            time: new Date(t.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            height: parseFloat(t.v),
            type: t.type === 'H' ? 'High' : 'Low',
          })) || [];

        setTides(tideData);
        localStorage.setItem(
          `tide_${resolvedStationId}`,
          JSON.stringify({ data: tideData, timestamp: Date.now() })
        );
      } catch {
        toast.error('Failed to load tide data');
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, [resolvedStationId]);

  if (loading) return <Card className="p-4">Loading tide data...</Card>;

  if (!resolvedStationId) {
    return (
      <Card className="p-4">
        <h3 className="font-bold mb-2">Today's Tides</h3>
        <p className="text-sm text-muted-foreground">
          Tide station not configured for this location yet.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="font-bold">Today's Tides</h3>
        <span className="text-xs text-muted-foreground">Station {resolvedStationId}</span>
      </div>
      <div className="space-y-2">
        {tides.map((tide, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <div className="flex items-center gap-2">
              {tide.type === 'High' ? (
                <ArrowUp className="w-4 h-4 text-blue-600" />
              ) : (
                <ArrowDown className="w-4 h-4 text-gray-600" />
              )}
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

export default TideChart;
