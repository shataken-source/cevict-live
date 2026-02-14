import type { Telemetry } from "@/app/lib/telemetry-types";

export interface SystemConfig {
  panelModel: string;
  panelWattage: number;
  panelCount: number;
  panelVocV: number;
  panelVmpV: number;
  seriesStrings: number;
  parallelPanels: number;

  batteryChemistry: "LiFePO4" | "AGM" | "Lead-acid";
  batteryVoltageV: number;
  batteryCapacityAh: number;
  batteryCount: number;

  controllerType: "MPPT" | "PWM";
  controllerMaxVocV: number;
  controllerMaxA: number;

  inverterModel: string;
  inverterPowerW: number;

  latitude: number;
  longitude: number;
  tiltAngleDegrees: number;
  azimuthDegrees: number;
  mountType: "roof_fixed" | "ground_fixed" | "adjustable" | "tracking";

  shadingMorningLossPct: number;
  shadingMiddayLossPct: number;
  shadingAfternoonLossPct: number;
}

export interface ScenarioConfig extends SystemConfig {
  name: string;
  description?: string;
}

export interface ColdWeatherWarning {
  type: "voc_too_high" | "voc_safe" | "temperature_risk";
  title: string;
  message: string;
  currentVocV: number;
  maxVocAllowedV: number;
  temperatureC?: number;
  severity: "warning" | "danger" | "info";
}

export interface ScenarioResults {
  annualProductionKWh: number;
  summerProductionKWh: number;
  winterProductionKWh: number;
  dailyAverageKWh: number;
  gridIndependencePct: number;
  selfConsumptionPct: number;
  paybackYears: number;
  twentyYearROI: number;
  estimatedCost: number;
  annualSavings: number;
  efficiency: number;
  coldWeatherWarnings: ColdWeatherWarning[];
}

// ============================================================================
// COLD-WEATHER VOLTAGE CALCULATION
// ============================================================================
// Solar panels increase voltage in cold weather
// Formula: Voc_cold = Voc_rated + (Temp_cold - Temp_rated) * Temp_coeff
// Typical temp coeff: -0.31% per °C (negative means voltage increases as temp drops)

export function calculateColdWeatherVoc(
  panelVocRated: number,
  temperatureC: number = -10, // Worst case: -10°C
  tempCoefficientPctPerC: number = -0.31 // Typical solar panel temp coefficient
): number {
  const standardTemp = 25; // STC: 25°C
  const tempDelta = temperatureC - standardTemp;
  const vocChange = panelVocRated * (tempCoefficientPctPerC / 100) * tempDelta;
  const vocCold = panelVocRated + vocChange;
  return vocCold;
}

export function calculateStringVoltage(
  seriesStrings: number,
  panelVocPerString: number
): number {
  return seriesStrings * panelVocPerString;
}

export function checkVoltageWarnings(
  config: SystemConfig,
  temperatureC: number = -10
): ColdWeatherWarning[] {
  const warnings: ColdWeatherWarning[] = [];

  // Calculate Voc for each panel in cold weather
  const panelVocCold = calculateColdWeatherVoc(config.panelVocV, temperatureC);

  // Calculate string voltage (all panels in series for one string)
  const stringVocCold = calculateStringVoltage(config.seriesStrings, panelVocCold);

  // Check if exceeds controller maximum
  if (stringVocCold > config.controllerMaxVocV) {
    warnings.push({
      type: "voc_too_high",
      title: "⚠️ Cold Weather Voltage Risk",
      message: `At ${temperatureC}°C, your panel array will reach ${stringVocCold.toFixed(1)}V, exceeding your controller's ${config.controllerMaxVocV}V limit. This could damage your controller or shut it down. Consider: (1) adding strings in parallel instead of series, (2) upgrading to higher-voltage controller, or (3) adding protective fuse/breaker.`,
      currentVocV: stringVocCold,
      maxVocAllowedV: config.controllerMaxVocV,
      temperatureC,
      severity: stringVocCold > config.controllerMaxVocV * 1.1 ? "danger" : "warning",
    });
  } else if (stringVocCold > config.controllerMaxVocV * 0.9) {
    warnings.push({
      type: "voc_too_high",
      title: "ℹ️ Operating Close to Limit",
      message: `At ${temperatureC}°C, your array reaches ${stringVocCold.toFixed(1)}V, which is 90% of your controller's ${config.controllerMaxVocV}V limit. You have little margin for error. Monitor winter conditions closely.`,
      currentVocV: stringVocCold,
      maxVocAllowedV: config.controllerMaxVocV,
      temperatureC,
      severity: "info",
    });
  } else {
    warnings.push({
      type: "voc_safe",
      title: "✅ Voltage Safe in Cold",
      message: `Your system is safe. At ${temperatureC}°C, voltage reaches ${stringVocCold.toFixed(1)}V, well below your ${config.controllerMaxVocV}V limit (${((stringVocCold / config.controllerMaxVocV) * 100).toFixed(0)}% utilization).`,
      currentVocV: stringVocCold,
      maxVocAllowedV: config.controllerMaxVocV,
      temperatureC,
      severity: "info",
    });
  }

  return warnings;
}

// ============================================================================
// TILT OPTIMIZATION
// ============================================================================

export function calculateOptimalTilt(latitude: number): {
  annualOptimal: number;
  winterOptimal: number;
  summerOptimal: number;
  explanation: string;
} {
  // Industry formulas
  const annual = latitude * 0.76 + 3.1;
  const winter = latitude + 15;
  const summer = latitude - 15;

  return {
    annualOptimal: Math.max(0, Math.min(90, Math.round(annual))),
    winterOptimal: Math.max(0, Math.min(90, Math.round(winter))),
    summerOptimal: Math.max(0, Math.min(90, Math.round(summer))),
    explanation: `For latitude ${latitude.toFixed(1)}°:\n- Annual: ${Math.round(annual)}° (compromise)\n- Winter: ${Math.round(winter)}° (maximize Nov-Feb)\n- Summer: ${Math.round(summer)}° (maximize May-Aug)`,
  };
}

export function calculateTiltProductionDelta(
  currentTiltDegrees: number,
  optimalTiltDegrees: number,
  latitude: number
): number {
  // Approximation: Each degree off optimal costs ~0.45% production
  const delta = Math.abs(currentTiltDegrees - optimalTiltDegrees);
  const productionLossPct = delta * 0.45;
  return Math.max(0, Math.min(20, productionLossPct)); // Cap at 20% loss
}

// ============================================================================
// SCENARIO CALCULATION ENGINE
// ============================================================================

export function calculateScenarioResults(
  base: SystemConfig,
  proposed: SystemConfig,
  latitude: number,
  longitude: number
): ScenarioResults {
  // Simplified production estimator (hourly solar resource ~1.5 kWh/m²/day average)
  const panelAreaM2 = (proposed.panelWattage / 200) * proposed.panelCount; // Assume 200W per ~1.6m²
  const avgDailyIrradianceKWh = 4.5; // Average across US (varies 3-6)
  const systemEfficiency = 0.75; // 75% DC to AC accounting for losses

  const dailyProductionKWh = (panelAreaM2 * avgDailyIrradianceKWh * systemEfficiency) / 1000;
  const annualProductionKWh = dailyProductionKWh * 365;

  // Seasonal variation
  const summerProductionKWh = annualProductionKWh * 1.3; // Summer +30%
  const winterProductionKWh = annualProductionKWh * 0.65; // Winter -35%

  // Financial
  const costPerWatt = 2.5; // $2.50/W installed (2025 market rate)
  const totalWatts = proposed.panelWattage * proposed.panelCount;
  const estimatedCost = totalWatts * costPerWatt;

  const electricityValuePerKWh = 0.14; // $0.14/kWh average US
  const annualSavings = annualProductionKWh * electricityValuePerKWh;
  const paybackYears = estimatedCost / annualSavings;
  const twentyYearROI = (annualSavings * 20) - estimatedCost;

  // Grid independence (assume 15 kWh/day load)
  const dailyLoadKWh = 15;
  const gridIndependencePct = Math.min(
    100,
    (dailyProductionKWh / dailyLoadKWh) * 100
  );

  // Self-consumption (battery helps)
  const batteryCapacityKWh =
    (proposed.batteryVoltageV * proposed.batteryCapacityAh * proposed.batteryCount) / 1000;
  const selfConsumptionPct = Math.min(100, 60 + (batteryCapacityKWh / totalWatts) * 5);

  // Efficiency
  const efficiency = systemEfficiency * 100;

  // Voltage warnings
  const coldWeatherWarnings = checkVoltageWarnings(proposed, -10);

  return {
    annualProductionKWh: Math.round(annualProductionKWh),
    summerProductionKWh: Math.round(summerProductionKWh),
    winterProductionKWh: Math.round(winterProductionKWh),
    dailyAverageKWh: Math.round(dailyProductionKWh * 10) / 10,
    gridIndependencePct: Math.round(gridIndependencePct),
    selfConsumptionPct: Math.round(selfConsumptionPct),
    paybackYears: Number(paybackYears.toFixed(1)),
    twentyYearROI: Math.round(twentyYearROI),
    estimatedCost: Math.round(estimatedCost),
    annualSavings: Math.round(annualSavings),
    efficiency: Math.round(efficiency * 10) / 10,
    coldWeatherWarnings,
  };
}
