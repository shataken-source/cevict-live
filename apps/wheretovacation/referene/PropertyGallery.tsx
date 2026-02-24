import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const next = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <>
      <div className="relative h-96 rounded-lg overflow-hidden">
        <img src={images[currentIndex]} alt={title} className="w-full h-full object-cover cursor-pointer" onClick={() => setIsFullscreen(true)} />
        <Button variant="outline" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2" onClick={prev}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2" onClick={next}>
          <ChevronRight />
        </Button>
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setIsFullscreen(false)}>
            <X />
          </Button>
          <img src={images[currentIndex]} alt={title} className="max-h-full max-w-full object-contain" />
          <Button variant="outline" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2" onClick={prev}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2" onClick={next}>
            <ChevronRight />
          </Button>
        </div>
      )}
    </>
  );
}
