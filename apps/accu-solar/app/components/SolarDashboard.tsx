/**
 * SOLAR DASHBOARD - RESPONSIVE COMPONENTS
 * Uses project's CSS module system (not Tailwind)
 */

import React from "react";
import styles from "../page.module.css";

// ============================================================================
// TILT OPTIMIZATION CARD
// ============================================================================

interface TiltCardProps {
  latitude: number;
  annualOptimal: number;
  winterOptimal: number;
  summerOptimal: number;
  currentTilt?: number;
}

export const TiltOptimizationCard: React.FC<TiltCardProps> = ({
  latitude,
  annualOptimal,
  winterOptimal,
  summerOptimal,
  currentTilt,
}) => {
  const isOptimal = currentTilt === annualOptimal;

  return (
    <div
      className={styles.panel}
      style={{
        borderLeft: isOptimal ? '4px solid #34d399' : '4px solid #fbbf24',
        background: isOptimal
          ? 'linear-gradient(180deg, rgba(52, 211, 153, 0.08), rgba(52, 211, 153, 0.02)), rgba(0, 0, 0, 0.22)'
          : 'linear-gradient(180deg, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.02)), rgba(0, 0, 0, 0.22)'
      }}
    >
      <div className={styles.panelTitleRow}>
        <div className={styles.panelTitle}>📐 Panel Tilt</div>
        {isOptimal && <span style={{ color: '#34d399', fontSize: '11px' }}>✓ Optimal</span>}
      </div>

      <div className={styles.microGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '12px' }}>
        <div className={styles.micro}>
          <div className={styles.microLabel}>Annual Optimal</div>
          <div className={styles.microValue} style={{ color: '#7dd3fc', fontSize: '28px' }}>{annualOptimal}°</div>
        </div>
        <div className={styles.micro}>
          <div className={styles.microLabel}>Current</div>
          <div className={styles.microValue} style={{ color: isOptimal ? '#34d399' : '#fbbf24', fontSize: '28px' }}>
            {currentTilt || "—"}°
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <span style={{ color: '#a78bfa' }}>Winter:</span>{' '}
          <span style={{ color: '#7dd3fc', fontWeight: 600 }}>{winterOptimal}°</span>
        </div>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <span style={{ color: '#a78bfa' }}>Summer:</span>{' '}
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{summerOptimal}°</span>
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '11px', color: '#a78bfa' }}>
        Location: {latitude.toFixed(1)}°N
      </div>

      {!isOptimal && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: 'rgba(251, 191, 36, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          fontSize: '12px',
          color: '#fbbf24'
        }}>
          ⚠️ Adjust to {annualOptimal}° for ~3-5% more output
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CHARGE WINDOW CARD
// ============================================================================

interface ChargeWindowCardProps {
  peakStartHour: number;
  peakEndHour: number;
  expectedSOCPercent: number;
  expectedTimeToFull: string;
}

export const ChargeWindowCard: React.FC<ChargeWindowCardProps> = ({
  peakStartHour,
  peakEndHour,
  expectedSOCPercent,
  expectedTimeToFull,
}) => {
  const formatHour = (hour: number) => {
    const date = new Date();
    date.setHours(hour, 0, 0);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div
      className={styles.panel}
      style={{
        borderLeft: '4px solid #34d399',
        background: 'linear-gradient(180deg, rgba(52, 211, 153, 0.08), rgba(52, 211, 153, 0.02)), rgba(0, 0, 0, 0.22)'
      }}
    >
      <div className={styles.panelTitleRow}>
        <div className={styles.panelTitle}>⚡ Peak Charge Window</div>
      </div>

      <div style={{
        padding: '14px',
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))',
        borderRadius: '10px',
        marginBottom: '14px',
        border: '1px solid rgba(251, 191, 36, 0.2)'
      }}>
        <div style={{ fontSize: '11px', color: '#a78bfa', marginBottom: '4px' }}>Best Charging</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24' }}>
          {formatHour(peakStartHour)} — {formatHour(peakEndHour)}
        </div>
      </div>

      <div className={styles.microGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div className={styles.micro}>
          <div className={styles.microLabel}>Expected SOC</div>
          <div className={styles.microValue} style={{ color: '#34d399', fontSize: '24px' }}>{expectedSOCPercent}%</div>
        </div>
        <div className={styles.micro}>
          <div className={styles.microLabel}>Time to Full</div>
          <div className={styles.microValue} style={{ color: '#7dd3fc', fontSize: '20px' }}>{expectedTimeToFull}</div>
        </div>
      </div>

      <div style={{ marginTop: '14px' }}>
        <div style={{
          height: '10px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '5px',
          overflow: 'hidden'
        }}>
          <div
            style={{
              width: `${expectedSOCPercent}%`,
              height: '100%',
              background: '#34d399',
              transition: 'width 0.5s ease'
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SHADING IMPACT CARD
// ============================================================================

interface ShadingImpactCardProps {
  averageLossPercent: number;
  monthlyImpact: Array<{ month: string; lossPercent: number }>;
  recommendations: string[];
}

export const ShadingImpactCard: React.FC<ShadingImpactCardProps> = ({
  averageLossPercent,
  monthlyImpact,
  recommendations,
}) => {
  const severity =
    averageLossPercent > 25 ? "danger" : averageLossPercent > 15 ? "warning" : "good";

  const severityColors = {
    danger: { border: '#fb7185', bg: 'rgba(251, 113, 133, 0.08)', text: '#fb7185' },
    warning: { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)', text: '#fbbf24' },
    good: { border: '#34d399', bg: 'rgba(52, 211, 153, 0.08)', text: '#34d399' },
  };

  const colors = severityColors[severity];

  return (
    <div
      className={styles.panel}
      style={{
        borderLeft: `4px solid ${colors.border}`,
        background: `linear-gradient(180deg, ${colors.bg}, rgba(0, 0, 0, 0.02)), rgba(0, 0, 0, 0.22)`
      }}
    >
      <div className={styles.panelTitleRow}>
        <div className={styles.panelTitle}>🌳 Shading Impact</div>
      </div>

      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{
          fontSize: '36px',
          fontWeight: 800,
          color: colors.text
        }}>
          {averageLossPercent}%
        </div>
        <div style={{ fontSize: '12px', color: '#a78bfa' }}>Annual Production Loss</div>
      </div>

      {/* Mini sparkline for monthly trend */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '11px', color: '#a78bfa', marginBottom: '6px' }}>Monthly Variation</div>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '3px',
          height: '50px',
          padding: '8px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px'
        }}>
          {monthlyImpact.map((m, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max((m.lossPercent / 40) * 100, 8)}%`,
                background: m.lossPercent > 20 ? '#fb7185' : m.lossPercent > 10 ? '#fbbf24' : '#34d399',
                borderRadius: '2px',
                minHeight: '4px',
              }}
              title={`${m.month}: ${m.lossPercent}%`}
            />
          ))}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {recommendations.slice(0, 2).map((rec, i) => (
            <div
              key={i}
              style={{
                fontSize: '11px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                padding: '8px',
                color: '#e5e7eb'
              }}
            >
              • {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN SOLAR DASHBOARD
// ============================================================================

interface SolarDashboardProps {
  tilt: TiltCardProps;
  chargeWindow: ChargeWindowCardProps;
  shading: ShadingImpactCardProps;
}

export const SolarCommandDashboard: React.FC<SolarDashboardProps> = ({
  tilt,
  chargeWindow,
  shading,
}) => {
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '22px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '4px'
        }}>
          <span>☀️</span> Solar Command Center
        </div>
        <div style={{ fontSize: '13px', color: '#a78bfa' }}>
          Real-time optimization insights
        </div>
      </div>

      {/* Responsive Grid - Uses CSS from page.module.css */}
      <div className={styles.solarDashboardGrid}>
        <TiltOptimizationCard {...tilt} />
        <ChargeWindowCard {...chargeWindow} />
        <ShadingImpactCard {...shading} />
      </div>
    </div>
  );
};

// ============================================================================
// MOBILE-SPECIFIC COMPONENTS
// ============================================================================

/**
 * Mobile-optimized status bar (top of screen)
 */
export const MobileStatusBar: React.FC<{
  batterySOC: number;
  systemStatus: "charging" | "discharging" | "idle";
  timeToFull?: string;
}> = ({ batterySOC, systemStatus, timeToFull }) => {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      background: 'rgba(0,0,0,0.8)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: '12px 16px',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #34d399, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '16px'
          }}>
            {batterySOC}%
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>Battery</div>
            <div style={{ fontSize: '12px', color: '#a78bfa' }}>
              {systemStatus === "charging" ? "⚡ Charging" : systemStatus === "discharging" ? "📉 Discharging" : "— Idle"}
            </div>
          </div>
        </div>
        {timeToFull && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#a78bfa' }}>Time to Full</div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#7dd3fc' }}>{timeToFull}</div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Bottom action buttons (mobile-optimized)
 */
export const MobileActionBar: React.FC<{
  onOptimize?: () => void;
  onAdvised?: () => void;
}> = ({ onOptimize, onAdvised }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(0,0,0,0.9)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '12px 16px',
      display: 'flex',
      gap: '12px',
      zIndex: 100
    }}>
      <button
        onClick={onOptimize}
        style={{
          flex: 1,
          background: '#667eea',
          color: 'white',
          fontWeight: 600,
          padding: '12px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        📊 Optimize
      </button>
      <button
        onClick={onAdvised}
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.1)',
          color: '#e5e7eb',
          fontWeight: 600,
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer'
        }}
      >
        💡 AI Advisor
      </button>
    </div>
  );
};
