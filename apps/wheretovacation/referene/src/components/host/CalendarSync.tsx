import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RefreshCw, Plus, Trash2, Download, ExternalLink } from 'lucide-react';

interface CalendarSyncProps {
  propertyId: string;
  propertyName: string;
}

interface ICalFeed {
  id: string;
  platform: string;
  feed_url: string;
  last_synced_at: string | null;
  sync_enabled: boolean;
}

export function CalendarSync({ propertyId, propertyName }: CalendarSyncProps) {
  const [feeds, setFeeds] = useState<ICalFeed[]>([]);
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadFeeds = async () => {
    const { data, error } = await supabase
      .from('ical_feeds')
      .select('*')
      .eq('property_id', propertyId);
    
    if (!error && data) setFeeds(data);
  };

  useState(() => {
    loadFeeds();
  });

  const addFeed = async () => {
    if (!newPlatform || !newUrl) {
      toast.error('Please select platform and enter URL');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('ical_feeds').insert({
      property_id: propertyId,
      platform: newPlatform,
      feed_url: newUrl
    });

    if (error) {
      toast.error('Failed to add feed');
    } else {
      toast.success('iCal feed added');
      setNewPlatform('');
      setNewUrl('');
      loadFeeds();
    }
    setLoading(false);
  };

  const deleteFeed = async (feedId: string) => {
    const { error } = await supabase.from('ical_feeds').delete().eq('id', feedId);
    if (!error) {
      toast.success('Feed removed');
      loadFeeds();
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke('sync-ical-feeds', {
      body: { propertyId }
    });

    if (error) {
      toast.error('Sync failed');
    } else {
      toast.success(`Synced ${data.results.length} feeds`);
      loadFeeds();
    }
    setSyncing(false);
  };

  const exportUrl = `${supabase.functions.getUrl('export-ical-feed')}?propertyId=${propertyId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Synchronization - {propertyName}</CardTitle>
        <CardDescription>Import bookings from Airbnb, VRBO, Booking.com and export your calendar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Import from External Platforms</h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Platform</Label>
                <Select value={newPlatform} onValueChange={setNewPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="vrbo">VRBO</SelectItem>
                    <SelectItem value="booking">Booking.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>iCal Feed URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <Button onClick={addFeed} disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {feeds.length > 0 && (
            <div className="space-y-2">
              {feeds.map((feed) => (
                <div key={feed.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge>{feed.platform}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {feed.last_synced_at ? `Last synced: ${new Date(feed.last_synced_at).toLocaleString()}` : 'Never synced'}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteFeed(feed.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={syncNow} disabled={syncing || feeds.length === 0}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync All Feeds Now
          </Button>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <h3 className="font-semibold">Export Your Calendar</h3>
          <p className="text-sm text-muted-foreground">
            Use this iCal URL to import your bookings into other platforms
          </p>
          <div className="flex gap-2">
            <Input value={exportUrl} readOnly />
            <Button onClick={() => { navigator.clipboard.writeText(exportUrl); toast.success('Copied!'); }}>
              Copy
            </Button>
            <Button variant="outline" onClick={() => window.open(exportUrl, '_blank')}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}