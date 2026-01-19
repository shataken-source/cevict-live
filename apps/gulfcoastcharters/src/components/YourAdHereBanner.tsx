import { MousePointer, Megaphone, TrendingUp, Target, Sparkles } from 'lucide-react';

interface YourAdHereBannerProps {
  format?: 'horizontal' | 'vertical' | 'square';
  onAdClick?: () => void;
}

export default function YourAdHereBanner({ format = 'horizontal', onAdClick }: YourAdHereBannerProps) {
  const handleClick = () => {
    if (onAdClick) {
      onAdClick();
    } else {
      const advertiseSection = document.getElementById('advertise');
      if (advertiseSection) {
        advertiseSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const getHeightClass = () => {
    switch (format) {
      case 'vertical':
        return 'min-h-[600px]';
      case 'square':
        return 'min-h-[300px]';
      default:
        return 'min-h-[120px]';
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 rounded-lg shadow-lg border-2 border-dashed border-white/30 ${getHeightClass()} flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] transition-all duration-300 group`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
      
      <div className="text-center p-6 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Megaphone className="w-10 h-10 text-yellow-300 animate-bounce" />
          <Sparkles className="w-8 h-8 text-pink-300" />
          <Target className="w-10 h-10 text-green-300 animate-pulse" />
        </div>
        
        <h3 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
          Your Ad Here
        </h3>
        
        <p className="text-white/90 text-sm mb-3 font-medium">
          Reach thousands of travelers daily
        </p>
        
        <div className="flex items-center justify-center gap-2 text-yellow-300">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-semibold">Click to advertise your business</span>
          <MousePointer className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
