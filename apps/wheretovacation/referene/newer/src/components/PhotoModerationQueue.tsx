import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Flag, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingPhoto {
  id: string;
  url: string;
  caption: string;
  user_name: string;
  uploaded_at: string;
  quality_score: number;
  is_duplicate: boolean;
  flagged_count: number;
  tags: string[];
}

export function PhotoModerationQueue() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5',
      caption: 'Amazing red snapper caught today!',
      user_name: 'John Fisher',
      uploaded_at: '2024-01-15T10:30:00',
      quality_score: 85,
      is_duplicate: false,
      flagged_count: 0,
      tags: ['red-snapper', 'gulf-coast']
    }
  ]);
  const [selected, setSelected] = useState<string[]>([]);
  const { toast } = useToast();

  const handleModerate = (id: string, action: 'approve' | 'reject' | 'flag') => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    toast({ title: `Photo ${action}d successfully` });
  };

  const handleBulkAction = (action: string) => {
    setPhotos(prev => prev.filter(p => !selected.includes(p.id)));
    setSelected([]);
    toast({ title: `${selected.length} photos ${action}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Photo Moderation Queue</h2>
        {selected.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleBulkAction('approved')}>
              Approve Selected ({selected.length})
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulkAction('rejected')}>
              Reject Selected
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="border rounded-lg p-4 flex gap-4">
            <Checkbox
              checked={selected.includes(photo.id)}
              onCheckedChange={(checked) => {
                setSelected(prev => 
                  checked ? [...prev, photo.id] : prev.filter(id => id !== photo.id)
                );
              }}
            />
            <img src={photo.url} alt={photo.caption} className="w-32 h-32 object-cover rounded" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{photo.user_name}</span>
                <span className="text-sm text-gray-500">{new Date(photo.uploaded_at).toLocaleDateString()}</span>
              </div>
              <p>{photo.caption}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={photo.quality_score > 70 ? 'default' : 'destructive'}>
                  Quality: {photo.quality_score}%
                </Badge>
                {photo.is_duplicate && <Badge variant="destructive">Duplicate</Badge>}
                {photo.flagged_count > 0 && (
                  <Badge variant="destructive">
                    <Flag className="h-3 w-3 mr-1" />
                    {photo.flagged_count} reports
                  </Badge>
                )}
                {photo.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => handleModerate(photo.id, 'approve')}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleModerate(photo.id, 'reject')}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleModerate(photo.id, 'flag')}>
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
