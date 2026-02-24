import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Pause, RefreshCw, Clock, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ActivityManager from './ActivityManager';
import WebScraperModule from './WebScraperModule';


interface CrawlerResult {
  name: string;
  country: string;
  description: string;
  activities: string[];
  avgCost: string;
  bestTime: string;
  latitude: number;
  longitude: number;
  contactEmail: string;
}

export default function DestinationCrawler() {
  const [activities, setActivities] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [region, setRegion] = useState('');
  const [climate, setClimate] = useState('');
  const [travelStyle, setTravelStyle] = useState('');
  const [results, setResults] = useState<CrawlerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [nextRun, setNextRun] = useState<Date | null>(null);

  const activityOptions = ['Diving', 'Hiking', 'Beach', 'Culture', 'Adventure', 'Relaxation', 'Food', 'Wildlife', 'Skiing', 'Surfing'];

  const runCrawler = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('web-scraper', {
        body: {
          criteria: { activities, budget, region, climate, travelStyle }
        }
      });

      if (error) throw error;
      setResults(data.results || []);
      toast.success(`Found ${data.count} destinations!`);
      
      if (autoRun) {
        const next = new Date();
        next.setMinutes(next.getMinutes() + intervalMinutes);
        setNextRun(next);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoRun && intervalMinutes > 0) {
      timer = setInterval(() => {
        runCrawler();
      }, intervalMinutes * 60 * 1000);
    }
    return () => clearInterval(timer);
  }, [autoRun, intervalMinutes]);

  const toggleAutoRun = () => {
    if (!autoRun) {
      runCrawler();
    } else {
      setNextRun(null);
    }
    setAutoRun(!autoRun);
  };

  return (
    <div className="space-y-6">
      {/* Activity Manager Section */}
      <ActivityManager />

      {/* Web Scraper Module */}
      <WebScraperModule />

      {/* AI Destination Crawler */}

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">AI Destination Crawler</h2>
          {autoRun && nextRun && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Next run: {nextRun.toLocaleTimeString()}
            </Badge>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Activities</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {activityOptions.map(act => (
                <Badge
                  key={act}
                  variant={activities.includes(act) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setActivities(prev => 
                    prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]
                  )}
                >
                  {act}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label>Budget</Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget ($50-100/day)</SelectItem>
                  <SelectItem value="moderate">Moderate ($100-200/day)</SelectItem>
                  <SelectItem value="luxury">Luxury ($200+/day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Climate</Label>
              <Select value={climate} onValueChange={setClimate}>
                <SelectTrigger><SelectValue placeholder="Select climate" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tropical">Tropical</SelectItem>
                  <SelectItem value="temperate">Temperate</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Region</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g., Caribbean, Asia" />
          </div>

          <div>
            <Label>Interval (minutes)</Label>
            <Input 
              type="number" 
              value={intervalMinutes} 
              onChange={(e) => setIntervalMinutes(Number(e.target.value))} 
              min="1"
              placeholder="60"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={runCrawler} disabled={loading || autoRun}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2" />}
            Run Now
          </Button>
          <Button variant={autoRun ? 'destructive' : 'default'} onClick={toggleAutoRun}>
            {autoRun ? <Pause className="mr-2" /> : <RefreshCw className="mr-2" />}
            {autoRun ? 'Stop Auto Run' : 'Start Auto Run'}
          </Button>
        </div>
      </Card>

      {results.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Found {results.length} Destinations</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((dest, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{dest.name}</h3>
                  <Button size="sm" variant="ghost">
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{dest.country}</p>
                <p className="mt-2 text-sm">{dest.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {dest.activities?.map(act => <Badge key={act} variant="secondary" className="text-xs">{act}</Badge>)}
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-sm"><strong>Cost:</strong> {dest.avgCost}</p>
                  <p className="text-sm"><strong>Best Time:</strong> {dest.bestTime}</p>
                  <p className="text-xs text-muted-foreground">{dest.contactEmail}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
