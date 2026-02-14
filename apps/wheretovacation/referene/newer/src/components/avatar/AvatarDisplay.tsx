import { useMemo } from 'react';

interface AvatarDisplayProps {
  sex?: string;
  skinColor?: string;
  hairStyle?: string;
  hairColor?: string;
  bodyType?: string;
  equippedItems?: string[];
  size?: number;
}

export default function AvatarDisplay({
  sex = 'male',
  skinColor = '#f5d0a9',
  hairStyle = 'short',
  hairColor = '#4a3728',
  bodyType = 'average',
  equippedItems = [],
  size = 120
}: AvatarDisplayProps) {
  
  const hasItem = (type: string) => equippedItems.some(item => item.includes(type));

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className="rounded-full">
      {/* Background */}
      <circle cx="100" cy="100" r="100" fill="#e0f2fe" />
      
      {/* Body */}
      <ellipse cx="100" cy="160" rx="50" ry="40" fill={skinColor} />
      
      {/* Head */}
      <circle cx="100" cy="80" r="45" fill={skinColor} />
      
      {/* Hair */}
      {hairStyle === 'short' && (
        <path d="M 55 70 Q 55 40 100 35 Q 145 40 145 70 Z" fill={hairColor} />
      )}
      {hairStyle === 'long' && (
        <>
          <path d="M 55 70 Q 55 35 100 30 Q 145 35 145 70 Z" fill={hairColor} />
          <path d="M 60 80 Q 55 120 65 140 M 140 80 Q 145 120 135 140" stroke={hairColor} strokeWidth="8" fill="none" />
        </>
      )}
      
      {/* Eyes */}
      <circle cx="85" cy="75" r="5" fill="#2c3e50" />
      <circle cx="115" cy="75" r="5" fill="#2c3e50" />
      
      {/* Nose */}
      <line x1="100" y1="85" x2="100" y2="95" stroke={skinColor} strokeWidth="2" filter="brightness(0.8)" />
      
      {/* Mouth */}
      <path d="M 85 105 Q 100 110 115 105" stroke="#c0392b" strokeWidth="2" fill="none" />
      
      {/* Sunglasses */}
      {hasItem('sunglasses') && (
        <g>
          <rect x="70" y="70" width="25" height="15" rx="3" fill="#1a1a1a" opacity="0.8" />
          <rect x="105" y="70" width="25" height="15" rx="3" fill="#1a1a1a" opacity="0.8" />
          <line x1="95" y1="77" x2="105" y2="77" stroke="#1a1a1a" strokeWidth="2" />
        </g>
      )}
      
      {/* Hat */}
      {hasItem('hat') && (
        <g>
          <ellipse cx="100" cy="45" rx="50" ry="8" fill="#3498db" />
          <rect x="75" y="30" width="50" height="15" rx="5" fill="#3498db" />
        </g>
      )}
      
      {/* Accessory (bag) */}
      {hasItem('bag') && (
        <path d="M 130 140 Q 140 150 135 165 L 145 165 Q 150 150 140 140 Z" fill="#e74c3c" stroke="#c0392b" strokeWidth="2" />
      )}
    </svg>
  );
}