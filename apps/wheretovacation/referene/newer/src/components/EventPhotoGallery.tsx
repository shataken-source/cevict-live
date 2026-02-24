import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, Award, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhotoDetailModal from './PhotoDetailModal';
import { useToast } from '@/hooks/use-toast';

interface Photo {
  id: string;
  photoUrl: string;
  caption: string;
  uploadedAt: string;
  userId: string;
  userName: string;
  votes?: number;
}

interface EventPhotoGalleryProps {
  eventId: string;
  isOrganizer: boolean;
  currentUserId: string;
  currentUserName: string;
  eventAttendees: any[];
}

export function EventPhotoGallery({ eventId, isOrganizer, currentUserId, currentUserName, eventAttendees }: EventPhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [votedPhotos, setVotedPhotos] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPhotos();
  }, [eventId]);

  const loadPhotos = async () => {
    const photosKey = `event_photos_${eventId}`;
    const stored = localStorage.getItem(photosKey);
    const photosList = stored ? JSON.parse(stored) : [];
    
    const photosWithVotes = photosList.map((photo: Photo) => ({
      ...photo,
      votes: parseInt(localStorage.getItem(`photo_votes_${photo.id}`) || '0')
    }));
    
    setPhotos(photosWithVotes.sort((a: Photo, b: Photo) => (b.votes || 0) - (a.votes || 0)));
    
    const voted = new Set<string>();
    photosList.forEach((photo: Photo) => {
      if (localStorage.getItem(`vote_${currentUserId}_${photo.id}`)) {
        voted.add(photo.id);
      }
    });
    setVotedPhotos(voted);
  };

  const handleVote = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (votedPhotos.has(photoId)) {
      toast({ title: 'Already voted', description: 'You already voted for this photo' });
      return;
    }

    setVoting(photoId);
    const { data, error } = await supabase.functions.invoke('photo-contest-manager', {
      body: { action: 'vote', photoId, userId: currentUserId, eventId }
    });

    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || 'Failed to vote', variant: 'destructive' });
    } else {
      toast({ title: 'Vote recorded!', description: 'Your vote has been counted' });
      setVotedPhotos(prev => new Set(prev).add(photoId));
      loadPhotos();
    }
    setVoting(null);
  };

  const topPhotos = photos.slice(0, 3);
  const otherPhotos = photos.slice(3);

  return (
    <div className="space-y-8">
      {topPhotos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-yellow-500" />
            <h3 className="text-xl font-bold">Top Voted Photos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPhotos.map((photo, idx) => (
              <div key={photo.id} className="relative group overflow-hidden rounded-lg border-2 border-yellow-400">
                <div className="aspect-square cursor-pointer" onClick={() => setSelectedPhoto(photo)}>
                  <img src={photo.photoUrl} alt={photo.caption} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                  #{idx + 1}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-white text-sm font-medium mb-2">{photo.userName}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-white text-sm">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{photo.votes || 0} votes</span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={(e) => handleVote(photo.id, e)} disabled={votedPhotos.has(photo.id) || voting === photo.id}>
                      {votedPhotos.has(photo.id) ? 'Voted' : 'Vote'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold mb-4">All Photos</h3>
        {photos.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><p>No photos yet. Be the first to share!</p></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherPhotos.map((photo) => (
              <div key={photo.id} className="relative group overflow-hidden rounded-lg">
                <div className="aspect-square cursor-pointer" onClick={() => setSelectedPhoto(photo)}>
                  <img src={photo.photoUrl} alt={photo.caption} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <div className="flex items-center justify-between text-white text-sm">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{photo.votes || 0}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-white hover:bg-white/20" onClick={(e) => handleVote(photo.id, e)} disabled={votedPhotos.has(photo.id)}>
                      {votedPhotos.has(photo.id) ? '✓' : 'Vote'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPhoto && (
        <PhotoDetailModal photo={selectedPhoto} isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} currentUserId={currentUserId} currentUserName={currentUserName} eventAttendees={eventAttendees} onPhotoUpdate={(updated) => { setSelectedPhoto(updated); loadPhotos(); }} />
      )}
    </div>
  );
}
