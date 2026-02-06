"use client";


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
  const normalizedConfidence = Math.max(0, Math.min(1, confidence));
  const percentageStr = size === 'small' ? `${Math.round(normalizedConfidence * 100)}%` : `${(normalizedConfidence * 100).toFixed(1)}%`;

  const sizeConfig = {
    small: { width: 60, height: 30, fontSize: 10 },
    medium: { width: 100, height: 50, fontSize: 12 },
    large: { width: 150, height: 75, fontSize: 14 }
  };

  const config = sizeConfig[size];

  const getColor = (value: number) => {
    if (color) return color;
    if (value >= 0.8) return '#059669'; // emerald-600
    if (value >= 0.6) return '#0ea5e9'; // sky-500
    if (value >= 0.4) return '#f59e0b'; // amber-500
    return '#dc2626'; // red-600
  };

  const gaugeColor = getColor(normalizedConfidence);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={config.width} height={config.height} viewBox="0 0 100 50">
        {/* Background arc */}
        <path
          d="M 10 40 A 40 40 0 0 1 90 40"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Confidence arc */}
        <path
          d="M 10 40 A 40 40 0 0 1 90 40"
          fill="none"
          stroke={gaugeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${normalizedConfidence * 126} 126`}
          style={{
            transition: 'stroke-dasharray 0.5s ease-in-out'
          }}
        />

        {/* Center dot */}
        <circle
          cx="50"
          cy="40"
          r="4"
          fill={gaugeColor}
        />

        {/* Percentage text */}
        <text
          x="50"
          y="25"
          textAnchor="middle"
          fontSize={config.fontSize}
          fontWeight="bold"
          fill={gaugeColor}
        >
          {percentageStr}
        </text>
      </svg>

      {showLabel && (
        <div style={{ fontSize: config.fontSize, color: '#64748b' }}>
          Confidence
        </div>
      )}
    </div>
  );
}
