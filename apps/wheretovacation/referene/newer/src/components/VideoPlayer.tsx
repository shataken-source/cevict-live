import { useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
}

export default function VideoPlayer({ videoUrl, thumbnailUrl, title }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black group">
      {!isPlaying ? (
        <div className="relative cursor-pointer" onClick={() => setIsPlaying(true)}>
          <img src={thumbnailUrl} alt={title} className="w-full h-64 object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <video
            src={videoUrl}
            className="w-full h-64 object-cover"
            autoPlay
            muted={isMuted}
            controls
          />
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
            <Button size="sm" variant="secondary" onClick={() => setIsPlaying(false)}>
              <Pause className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="secondary">
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="p-3 bg-gray-900">
        <p className="text-white font-medium text-sm">{title}</p>
      </div>
    </div>
  );
}
