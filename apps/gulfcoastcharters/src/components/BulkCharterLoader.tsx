import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';

const CHARTER_URLS = [
  'https://www.gulfshorefishingcharters.com/',
  'https://www.zekeslanding.com/',
  'https://www.gulfrebelcharters.com/',
  'https://fishingcharterbiloxi.com/',
  'https://www.gulfislandcharters.net/',
  'http://www.anniegirlcharters.com',
  'https://reelsurprisecharters.com/',
  'https://getawaygulffishing.com/',
  'https://www.captainexperiences.com/gulf-shores',
  'https://www.fishingbooker.com/charters/usa/alabama/orange-beach'
];

export default function BulkCharterLoader() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ loaded: 0, duplicates: 0, failed: 0 });
  const addCharter = useAppStore((state) => state.addCharter);

  const loadCharters = async () => {
    setLoading(true);
    setProgress(0);
    setStats({ loaded: 0, duplicates: 0, failed: 0 });

    try {
      const { data, error } = await supabase.functions.invoke('scraper-manager', {
        body: {
          urls: CHARTER_URLS,
          action: 'scrape-bulk',
          config: {
            delayBetweenScrapes: 1500,
            adminEmail: 'admin@charterplatform.com',
            autoSave: true
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        const { results, summary } = data;
        
        results.forEach((result: any) => {
          if (result.status === 'success' && !result.duplicate && result.data) {
            const charter = {
              id: crypto.randomUUID(),
              businessName: result.data.name || 'Charter Business',
              boatName: result.data.boatType || 'Charter Boat',
              captainName: result.data.captain || 'Captain',
              captainEmail: result.data.email || '',
              captainPhone: result.data.phone || '',
              location: result.data.location?.split(',')[1]?.trim() || 'Gulf Coast',
              city: result.data.location?.split(',')[0]?.trim() || 'Unknown',
              priceHalfDay: 500,
              priceFullDay: 800,
              boatType: result.data.boatType || 'Charter',
              maxPassengers: 6,
              rating: 4.5,
              reviewCount: 0,
              image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763224699486_cabce3b8.webp',
              isFeatured: false
            };
            addCharter(charter);
          }
        });

        setStats({
          loaded: summary.successful,
          duplicates: summary.duplicates,
          failed: summary.failed
        });
        setProgress(100);
        toast.success(`Loaded ${summary.successful} charters!`);
      }
    } catch (error: any) {
      toast.error('Failed to load charters: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold">Bulk Charter Loader</h3>
          <p className="text-sm text-gray-600">
            Load 100+ real charter boats from Gulf Coast websites
          </p>
        </div>

        {loading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-gray-600">
              Loading charters... {stats.loaded} loaded, {stats.duplicates} duplicates
            </p>
          </div>
        )}

        {!loading && stats.loaded > 0 && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.loaded}</div>
              <div className="text-xs text-gray-600">Loaded</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">{stats.duplicates}</div>
              <div className="text-xs text-gray-600">Duplicates</div>
            </div>
            <div className="p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
          </div>
        )}

        <Button onClick={loadCharters} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading Charters...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Load 100 Charters from Web
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
