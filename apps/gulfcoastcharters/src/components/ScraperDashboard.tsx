import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/appStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { scraperUrls, scraperConfig } from '@/data/scraperUrls';
import { Loader2, CheckCircle, XCircle, Download } from 'lucide-react';

export default function ScraperDashboard() {
  const [singleUrl, setSingleUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@charterplatform.com');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const addCharter = useAppStore((state) => state.addCharter);


  useEffect(() => {
    const urlList = scraperUrls.map(u => u.url).join('\n');
    setBulkUrls(urlList);
  }, []);


  const scrapeSingle = async () => {
    if (!singleUrl.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('web-scraper', {
        body: { url: singleUrl },
      });

      if (error) throw error;

      const result = { 
        url: singleUrl, 
        status: data.success ? 'success' : 'failed',
        data: data.success ? data.data : null,
        error: data.success ? null : data.error,
        timestamp: new Date().toISOString()
      };

      setResults([result]);
      setHistory(prev => [result, ...prev].slice(0, 50));

      if (data.success && scraperConfig.autoSave) {
        await saveCharter(result);
      }
    } catch (error: any) {
      setResults([{ url: singleUrl, status: 'failed', error: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const scrapeBulk = async () => {
    const urls = bulkUrls.split('\n').filter(u => u.trim()).map(u => u.trim());
    if (urls.length === 0) return;

    setLoading(true);
    setResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('scraper-manager', {
        body: { 
          urls, 
          action: 'scrape-bulk',
          config: scraperConfig
        },
      });

      if (error) throw error;

      if (data.success) {
        setResults(data.results);
        setHistory(prev => [...data.results, ...prev].slice(0, 50));

        // Auto-save successful scrapes
        if (scraperConfig.autoSave) {
          for (const result of data.results) {
            if (result.status === 'success') {
              await saveCharter(result);
            }
          }
        }
      }
    } catch (error: any) {
      alert('Bulk scraping failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCharter = async (result: any) => {
    if (!result.data) return;
    
    try {
      const priceMatch = result.data.pricing?.match(/\$?(\d+)/g);
      const charter = {
        id: crypto.randomUUID(),
        businessName: result.data.name || 'Unknown',
        boatName: result.data.boatType || 'Charter',
        captainName: result.data.captain || 'Captain',
        captainEmail: result.data.email || '',
        captainPhone: result.data.phone || '',
        location: result.data.location?.split(',')[1]?.trim() || 'Gulf Coast',
        city: result.data.location?.split(',')[0]?.trim() || 'Unknown',
        priceHalfDay: priceMatch ? parseInt(priceMatch[0].replace('$', '')) : 500,
        priceFullDay: priceMatch && priceMatch[1] ? parseInt(priceMatch[1].replace('$', '')) : 800,
        boatType: result.data.boatType || 'Charter',
        maxPassengers: parseInt(result.data.capacity) || 6,
        rating: 0,
        reviewCount: 0,
        image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763224699486_cabce3b8.webp',
        isFeatured: false,
      };

      addCharter(charter);
      await supabase.functions.invoke('charter-storage', {
        body: { action: 'save', charter },
      });
    } catch (error: any) {
      console.error('Save error:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Charter Scraper Dashboard</h2>
          <p className="text-gray-600">Extract charter information from websites using AI</p>
        </div>
      </div>
      
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="single">Single URL</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Scrape</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <div className="flex gap-4">
            <Input
              value={singleUrl}
              onChange={(e) => setSingleUrl(e.target.value)}
              placeholder="https://charter-website.com"
              className="flex-1"
              disabled={loading}
            />
            <Button onClick={scrapeSingle} disabled={loading || !singleUrl}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scraping...</> : 'Scrape'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Textarea
            value={bulkUrls}
            onChange={(e) => setBulkUrls(e.target.value)}
            placeholder="Enter URLs (one per line)"
            rows={8}
            disabled={loading}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {bulkUrls.split('\n').filter(u => u.trim()).length} URLs ready
            </span>
            <Button onClick={scrapeBulk} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scraping...</> : 
                `Scrape ${bulkUrls.split('\n').filter(u => u.trim()).length} URLs`}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No scraping history yet</p>
            ) : (
              history.map((h, i) => (
                <Card key={i} className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{h.url}</p>
                      <p className="text-xs text-gray-500">{new Date(h.timestamp).toLocaleString()}</p>
                    </div>
                    <Badge variant={h.status === 'success' ? 'default' : 'destructive'}>
                      {h.status === 'success' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {h.status}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-bold">Results</h3>
          {results.map((r, i) => (
            <Card key={i} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1 break-all">{r.url}</p>
                  <Badge variant={r.status === 'success' ? 'default' : 'destructive'}>
                    {r.status}
                  </Badge>
                </div>
                {r.status === 'success' && !scraperConfig.autoSave && (
                  <Button onClick={() => saveCharter(r)} size="sm">Save</Button>
                )}
              </div>
              {r.status === 'success' && r.data && (
                <div className="space-y-1 text-sm bg-gray-50 p-3 rounded">
                  <p><strong>Name:</strong> {r.data.name}</p>
                  <p><strong>Location:</strong> {r.data.location}</p>
                  {r.data.phone && <p><strong>Phone:</strong> {r.data.phone}</p>}
                  {scraperConfig.autoSave && (
                    <p className="text-green-600 mt-2">✓ Auto-saved to listings</p>
                  )}
                </div>
              )}
              {r.status === 'failed' && (
                <p className="text-red-600 text-sm">{r.error}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
