import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DeduplicationTool() {
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);

  const findDuplicates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('listing-deduplication', {
        body: { action: 'find-duplicates' }
      });

      if (error) throw error;
      setDuplicateGroups(data.duplicateGroups || []);
    } catch (error) {
      console.error('Error finding duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const mergeDuplicates = async (primaryId: string, duplicateIds: string[]) => {
    setMerging(primaryId);
    try {
      const { data, error } = await supabase.functions.invoke('listing-deduplication', {
        body: { action: 'merge', primaryId, duplicateIds }
      });

      if (error) throw error;
      await findDuplicates();
    } catch (error) {
      console.error('Error merging:', error);
    } finally {
      setMerging(null);
    }
  };

  useEffect(() => {
    findDuplicates();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Duplicate Listings</h2>
        <Button onClick={findDuplicates} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Scan for Duplicates
        </Button>
      </div>

      {duplicateGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg">No duplicates found!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map((group, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    {group[0].business_name}
                  </CardTitle>
                  <Badge variant="destructive">{group.length} Duplicates</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.map((listing: any, listingIdx: number) => (
                  <div key={listing.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{listing.business_name}</p>
                        <p className="text-sm text-muted-foreground">{listing.website_url}</p>
                        <p className="text-sm">{listing.phone}</p>
                        <p className="text-xs text-muted-foreground">
                          Scraped: {new Date(listing.scraped_at).toLocaleDateString()}
                        </p>
                        {listing.is_claimed && (
                          <Badge variant="secondary">Claimed</Badge>
                        )}
                      </div>
                      {listingIdx === 0 && (
                        <Button
                          size="sm"
                          onClick={() => mergeDuplicates(
                            listing.id,
                            group.slice(1).map((l: any) => l.id)
                          )}
                          disabled={merging === listing.id}
                        >
                          {merging === listing.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Keep This'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
