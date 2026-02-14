/**
 * SHADING LOSS MODELING SERVICE
 * 
 * Calculates impact of:
 * - Partial shading at different times of day
 * - Seasonal shading (trees, buildings)
 * - String shading (one panel blocks rest)
 * - Microinverter vs central inverter implications
 */

export interface ShadingProfile {
  morning: number; // 0-100% shaded
  midday: number;
  afternoon: number;
  seasonal: "none" | "winter" | "summer" | "year_round";
}

export interface ShadingImpactResult {
  averageLossPercent: number;
  monthlyImpact: {
    month: string;
    lossPercent: number;
  }[];
  recommendations: string[];
  optimizerROI?: {
    recommended: boolean;
    paybackYears: number;
  };
}

/**
 * Core shading loss calculation
 * Uses string voltage theory: one shaded panel can block entire string
 */
export function calculateShadingLoss(profile: ShadingProfile): ShadingImpactResult {
  // Hourly loss estimate (simplified 24h)
  const hourlyLoss = [
    // Morning 6-10 AM
    profile.morning * 0.7, // Shading gradually increases
    profile.morning * 0.8,
    profile.morning * 0.9,
    profile.morning * 1.0,
    // Midday 10 AM - 2 PM
    profile.midday * 0.5, // Peak sun angle, less shading
    profile.midday * 0.4,
    profile.midday * 0.3,
    profile.midday * 0.4,
    // Afternoon 2-6 PM
    profile.afternoon * 0.8,
    profile.afternoon * 0.9,
    profile.afternoon * 0.95,
    profile.afternoon * 1.0,
  ];

  const dailyAverage = hourlyLoss.reduce((a, b) => a + b) / hourlyLoss.length;

  // Seasonal adjustment
  let seasonalMultiplier = 1.0;
  switch (profile.seasonal) {
    case "winter":
      seasonalMultiplier = 1.3; // Lower sun angle = more shading
      break;
    case "summer":
      seasonalMultiplier = 0.7; // Higher sun angle = less shading
      break;
    case "year_round":
      seasonalMultiplier = 1.1; // Consistent obstruction
      break;
  }

  const totalLoss = dailyAverage * seasonalMultiplier;

  // Monthly breakdown
  const monthlyImpact = [
    { month: "Jan", lossPercent: totalLoss * 1.4 },
    { month: "Feb", lossPercent: totalLoss * 1.3 },
    { month: "Mar", lossPercent: totalLoss * 1.1 },
    { month: "Apr", lossPercent: totalLoss * 0.9 },
    { month: "May", lossPercent: totalLoss * 0.7 },
    { month: "Jun", lossPercent: totalLoss * 0.6 },
    { month: "Jul", lossPercent: totalLoss * 0.6 },
    { month: "Aug", lossPercent: totalLoss * 0.7 },
    { month: "Sep", lossPercent: totalLoss * 0.9 },
    { month: "Oct", lossPercent: totalLoss * 1.1 },
    { month: "Nov", lossPercent: totalLoss * 1.3 },
    { month: "Dec", lossPercent: totalLoss * 1.4 },
  ].map((m) => ({
    ...m,
    lossPercent: Math.min(100, Math.round(m.lossPercent * 10) / 10),
  }));

  const recommendations: string[] = [];

  if (totalLoss > 15) {
    recommendations.push("Significant shading detected. Consider panel relocation or trimming obstructions.");
  }

  if (totalLoss > 25) {
    recommendations.push("Severe shading loss. Microinverters or power optimizers strongly recommended.");
  }

  if (profile.midday < 10 && (profile.morning > 20 || profile.afternoon > 20)) {
    recommendations.push("Shading primarily in morning/evening. Optimizers may not provide ROI.");
  }

  return {
    averageLossPercent: Math.round(totalLoss * 10) / 10,
    monthlyImpact,
    recommendations,
    optimizerROI:
      totalLoss > 15
        ? {
            recommended: true,
            paybackYears: calculateOptimizerPayback(totalLoss),
          }
        : undefined,
  };
}

/**
 * Calculate ROI of adding microinverters or optimizers
 */
function calculateOptimizerPayback(shadingLoss: number): number {
  // Average optimizer cost: $150-200 per panel
  // Recovers ~60% of shading loss
  const costPerPanel = 175;
  const recovery = shadingLoss * 0.6;
  const annualValuePerPanel = recovery * 3.5; // ~$3.50/kWh saved per 1% loss
  return costPerPanel / annualValuePerPanel;
}

/**
 * Compare scenarios (no action, relocation, optimizers, etc.)
 */
export function compareShadingScenarios(
  profile: ShadingProfile,
  annualProductionKWh: number
) {
  const baseline = calculateShadingLoss(profile);
  const baselineProduction = annualProductionKWh * (1 - baseline.averageLossPercent / 100);

  const scenarios = [
    {
      name: "Current (No Action)",
      loss: baseline.averageLossPercent,
      annualKWh: baselineProduction,
      cost: 0,
      paybackYears: 0,
    },
    {
      name: "Microinverters (Per Panel)",
      loss: baseline.averageLossPercent * 0.4, // 60% recovery
      annualKWh: annualProductionKWh * (1 - (baseline.averageLossPercent * 0.4) / 100),
      cost: 175 * 8, // Assuming 8 panels
      paybackYears: baseline.optimizerROI?.paybackYears ?? 0,
    },
    {
      name: "Panel Relocation",
      loss: baseline.averageLossPercent * 0.2, // 80% recovery if moved
      annualKWh: annualProductionKWh * (1 - (baseline.averageLossPercent * 0.2) / 100),
      cost: 500, // Labor + racking adjustments
      paybackYears: 0.5,
    },
  ];

  return scenarios;
}
