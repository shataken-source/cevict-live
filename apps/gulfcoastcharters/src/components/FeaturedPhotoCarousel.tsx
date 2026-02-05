import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Heart, MapPin, Fish } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FeaturedPhoto {
  id: string;
  url: string;
  caption: string;
  photographer: string;
  species?: string;
  location: string;
  likes: number;
}

const featuredPhotos: FeaturedPhoto[] = [
  { id: '1', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383727273_974369fa.webp', caption: 'Epic Tarpon Jump', photographer: 'John Smith', species: 'Tarpon', location: 'Florida Keys', likes: 234 },
  { id: '2', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383724769_319a45b1.webp', caption: 'Trophy Redfish', photographer: 'Sarah Johnson', species: 'Redfish', location: 'Tampa Bay', likes: 189 },
  { id: '3', url: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383728282_b7f6d195.webp', caption: 'Gulf Coast Sunset', photographer: 'Mike Davis', location: 'Gulf of Mexico', likes: 156 },
];

export default function FeaturedPhotoCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % featuredPhotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((current + 1) % featuredPhotos.length);
  const prev = () => setCurrent((current - 1 + featuredPhotos.length) % featuredPhotos.length);

  const photo = featuredPhotos[current];

  return (
    <div className="relative h-[500px] rounded-2xl overflow-hidden group">
      <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
        <Badge className="mb-3 bg-blue-600">Featured Photo of the Week</Badge>
        <h3 className="text-3xl font-bold mb-2">{photo.caption}</h3>
        <p className="text-lg mb-3">by {photo.photographer}</p>
        <div className="flex items-center gap-4 flex-wrap">
          {photo.species && (
            <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <Fish className="w-4 h-4" />
              {photo.species}
            </span>
          )}
          <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <MapPin className="w-4 h-4" />
            {photo.location}
          </span>
          <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <Heart className="w-4 h-4 fill-white" />
            {photo.likes}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={prev}
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={next}
      >
        <ChevronRight className="w-6 h-6" />
      </Button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {featuredPhotos.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full transition-all ${idx === current ? 'bg-white w-8' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}
