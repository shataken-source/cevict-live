import { useState } from 'react';
import { X, Heart, Share2, MapPin, Fish, User, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';


interface Photo {
  id: string;
  url: string;
  caption: string;
  species?: string;
  location?: string;
  captain?: string;
  likes: number;
  liked: boolean;
}

const mockPhotos: Photo[] = [
  { id: '1', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383724769_319a45b1.webp', caption: 'Trophy Redfish!', species: 'Redfish', location: 'Tampa Bay', captain: 'Capt. Mike', likes: 45, liked: false },
  { id: '2', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383726234_f6eed351.webp', caption: 'Massive Grouper', species: 'Grouper', location: 'Gulf Coast', captain: 'Capt. Sarah', likes: 67, liked: false },
  { id: '3', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383727273_974369fa.webp', caption: 'Tarpon Jump!', species: 'Tarpon', location: 'Florida Keys', captain: 'Capt. John', likes: 89, liked: false },
  { id: '4', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383728282_b7f6d195.webp', caption: 'Beautiful Sunset', location: 'Gulf of Mexico', likes: 52, liked: false },
  { id: '5', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383729412_b0fbd480.webp', caption: 'First Catch!', species: 'Snapper', location: 'Clearwater', captain: 'Capt. Tom', likes: 38, liked: false },
  { id: '6', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383730345_3c090a18.webp', caption: 'Great Haul', location: 'Destin', captain: 'Capt. Mike', likes: 41, liked: false },
];

export default function TripPhotoGallery() {
  const { toast } = useToast();
  const [photos, setPhotos] = useState(mockPhotos);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const reportPhoto = (id: string) => {
    toast({ title: 'Photo reported', description: 'Thank you. Our moderation team will review this photo.' });
  };


  const toggleLike = (id: string) => {
    setPhotos(photos.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const nextPhoto = () => setCurrentIndex((currentIndex + 1) % photos.length);
  const prevPhoto = () => setCurrentIndex((currentIndex - 1 + photos.length) % photos.length);

  const currentPhoto = photos[currentIndex];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, idx) => (
          <div key={photo.id} className="relative group cursor-pointer" onClick={() => openLightbox(idx)}>
            <img src={photo.url} alt={photo.caption} className="w-full h-64 object-cover rounded-lg" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-end p-4">
              <p className="text-white font-semibold mb-2">{photo.caption}</p>
              <div className="flex gap-2 flex-wrap">
                {photo.species && <Badge variant="secondary"><Fish className="w-3 h-3 mr-1" />{photo.species}</Badge>}
                {photo.location && <Badge variant="secondary"><MapPin className="w-3 h-3 mr-1" />{photo.location}</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setLightboxOpen(false)}>
            <X className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="absolute left-4 text-white" onClick={prevPhoto}>
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button variant="ghost" size="icon" className="absolute right-4 text-white" onClick={nextPhoto}>
            <ChevronRight className="w-8 h-8" />
          </Button>
          <div className="max-w-5xl w-full px-4">
            <img src={currentPhoto.url} alt={currentPhoto.caption} className="w-full max-h-[70vh] object-contain mb-4" />
            <div className="text-white space-y-3">
              <h3 className="text-2xl font-bold">{currentPhoto.caption}</h3>
              <div className="flex gap-4 flex-wrap">
                {currentPhoto.species && <span className="flex items-center gap-2"><Fish className="w-5 h-5" />{currentPhoto.species}</span>}
                {currentPhoto.location && <span className="flex items-center gap-2"><MapPin className="w-5 h-5" />{currentPhoto.location}</span>}
                {currentPhoto.captain && <span className="flex items-center gap-2"><User className="w-5 h-5" />{currentPhoto.captain}</span>}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => toggleLike(currentPhoto.id)}>
                  <Heart className={`w-5 h-5 mr-2 ${currentPhoto.liked ? 'fill-red-500 text-red-500' : ''}`} />
                  {currentPhoto.likes}
                </Button>
                <Button variant="secondary"><Share2 className="w-5 h-5 mr-2" />Share</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
