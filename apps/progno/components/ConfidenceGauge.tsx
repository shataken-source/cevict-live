'use client';

interface Props {
  confidence: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export default function ConfidenceGauge({
  confidence,
  size = 'medium',
  showLabel = true,
}: Props) {
  const pct = Math.round((confidence <= 1 ? confidence * 100 : confidence));
  const clamped = Math.min(100, Math.max(0, pct));
  const sizeClass = size === 'small' ? 'text-sm' : size === 'large' ? 'text-xl' : 'text-base';

  return (
    <span className={`font-semibold text-blue-700 ${sizeClass}`}>
      {showLabel ? `${clamped}%` : `${clamped}%`}
    </span>
  );
}
