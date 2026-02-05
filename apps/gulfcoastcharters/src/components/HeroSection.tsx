import { memo } from 'react';
import FilterBar from './FilterBar';
import OptimizedImage from './OptimizedImage';

interface HeroSectionProps {
  onFilterChange?: (filters: any) => void;
}

const HeroSection = memo(function HeroSection({ onFilterChange }: HeroSectionProps) {
  return (
    <div data-testid="hero-section" className="relative h-[600px] bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900 overflow-hidden">

      <div className="absolute inset-0 bg-[url('https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763224544784_6539f327.webp')] bg-cover bg-center opacity-20"></div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent"></div>
      
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-white">
        <div className="text-center mb-12 space-y-6">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-violet-200 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Find Your Perfect Charter
          </h1>
          <p className="text-xl md:text-2xl text-purple-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
            Discover the best fishing charters across the Gulf Coast
          </p>
        </div>
        
        <div className="glass-effect rounded-2xl shadow-2xl p-8 w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <FilterBar onFilterChange={onFilterChange || (() => {})} />
        </div>
      </div>
    </div>
  );
});

export default HeroSection;

