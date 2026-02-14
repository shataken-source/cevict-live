import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
}

export function Hero({ onExplore }: HeroProps) {
  return (
    <div className="relative h-[600px] flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <img
          src="https://d64gsuwffb70l.cloudfront.net/691d9a62f6a983b58701866e_1763721902972_165bc41e.webp"
          alt="Luxury vacation rental"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="relative z-10 text-center text-white max-w-4xl px-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Your Perfect Vacation Awaits
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-200">
          Discover luxury waterfront rentals at the world's most beautiful destinations
        </p>

        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={onExplore} className="text-lg px-8">
            Explore Properties
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 backdrop-blur-sm text-white border-white hover:bg-white/20">
            List Your Property
          </Button>
        </div>
      </div>
    </div>
  );
}
