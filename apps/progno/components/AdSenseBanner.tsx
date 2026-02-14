'use client';

interface AdSenseBannerProps {
  adSlot: string;
  format: 'horizontal' | 'vertical' | 'rectangle';
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSenseBanner({ adSlot, format, style, className }: AdSenseBannerProps) {
  return (
    <div 
      className={className}
      style={{
        backgroundColor: '#f0f0f0',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '8px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: format === 'horizontal' ? '90px' : '250px',
        ...style
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-1234567890123456"
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (adsbygoogle = window.adsbygoogle || []).push({});
          `
        }}
      />
    </div>
  );
}
