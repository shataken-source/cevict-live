import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Photo {
  id: string;
  photo_url: string;
  caption: string;
  uploaded_at: string;
  is_approved: boolean;
  user_id: string;
}

interface EventPhotoModerationProps {
  eventId: string;
  moderatorId: string;
}

export function EventPhotoModeration({ eventId, moderatorId }: EventPhotoModerationProps) {
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingPhotos();
  }, [eventId]);

  const loadPendingPhotos = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('event-photo-manager', {
        body: { action: 'list', eventId, moderatorId }
      });

      if (error) throw error;
      setPendingPhotos((data.photos || []).filter((p: Photo) => !p.is_approved));
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (photoId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase.functions.invoke('event-photo-manager', {
        body: { action, photoId, moderatorId }
      });

      if (error) throw error;

      toast({
        title: action === 'approve' ? 'Photo approved' : 'Photo rejected',
        description: 'Photo has been moderated successfully.'
      });

      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div>Loading...</div>;

  if (pendingPhotos.length === 0) {
    return <div className="text-center py-8 text-gray-500">No pending photos to review</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Pending Photos ({pendingPhotos.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingPhotos.map((photo) => (
          <div key={photo.id} className="border rounded-lg p-4 space-y-3">
            <img
              src={photo.photo_url}
              alt={photo.caption || 'Pending photo'}
              className="w-full h-48 object-cover rounded"
            />
            {photo.caption && <p className="text-sm">{photo.caption}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleModerate(photo.id, 'approve')}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleModerate(photo.id, 'reject')}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
