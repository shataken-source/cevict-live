import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MobileResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function MobileResponsiveWrapper({ 
  children, 
  className 
}: MobileResponsiveWrapperProps) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      setOrientation(isLandscape ? 'landscape' : 'portrait');
    };

    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      );
    };

    checkOrientation();
    checkStandalone();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return (
    <div
      className={cn(
        'min-h-screen w-full',
        orientation === 'landscape' && 'landscape-mode',
        isStandalone && 'standalone-mode',
        className
      )}
      data-orientation={orientation}
      data-standalone={isStandalone}
    >
      {children}
    </div>
  );
}
