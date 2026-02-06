'use client';

interface ConfidenceGaugeProps {
  confidence: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  color?: string;
}

export default function ConfidenceGauge({
  confidence,
  size = 'medium',
  showLabel = true,
  color
}: ConfidenceGaugeProps) {
  const normalized = Math.max(0, Math.min(1, confidence));
  const percentage = (normalized * 100).toFixed(1);

  const sizeConfig = {
    small: { width: 60, height: 30, fontSize: 10 },
    medium: { width: 100, height: 50, fontSize: 12 },
    large: { width: 150, height: 75, fontSize: 14 }
  };

  const config = sizeConfig[size];

  const getColor = (value: number) => {
    if (color) return color;
    if (value >= 0.8) return '#059669'; // emerald
    if (value >= 0.6) return '#0ea5e9'; // sky
    if (value >= 0.4) return '#f59e0b'; // amber
    return '#dc2626'; // red
  };

  const gaugeColor = getColor(normalized);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={config.width} height={config.height} viewBox="0 0 100 50">
        <path d="M 10 40 A 40 40 0 0 1 90 40" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M 10 40 A 40 40 0 0 1 90 40"
          fill="none"
          stroke={gaugeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${normalized * 126} 126`}
        />
        <circle cx="50" cy="40" r="4" fill={gaugeColor} />
        <text x="50" y="25" textAnchor="middle" fontSize={config.fontSize} fontWeight="bold" fill={gaugeColor}>
          {percentage}%
        </text>
      </svg>
      {showLabel && (
        <div className="text-xs text-slate-500 dark:text-slate-400">Confidence</div>
      )}
    </div>
  );
}