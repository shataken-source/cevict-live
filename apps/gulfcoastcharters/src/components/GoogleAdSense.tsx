import { useEffect, useRef } from 'react';

interface GoogleAdSenseProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
}

export default function GoogleAdSense({ 
  slot = 'auto', 
  format = 'auto',
  style = {},
  className = ''
}: GoogleAdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (window.adsbygoogle && adRef.current && adRef.current.offsetWidth > 0) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);


  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block', minWidth: '250px', minHeight: '100px', ...style }}

      data-ad-client="ca-pub-0940073536675562"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
