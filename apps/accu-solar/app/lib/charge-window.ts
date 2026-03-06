/**
 * Charge window prediction utilities.
 *
 * All math is deterministic; no AI/LLM calls here. These helpers are meant
 * to be fed raw forecast + system parameters and return numbers the UI or
 * copilot can explain.
 */

export interface HourlyForecast {
  /** Global horizontal irradiance (W/m²). */
  ghi: number;
  /** Cloud cover 0–100 %. */
  cloudCover: number;
  /** Air temperature in °C. */
  temperatureC: number;
}

export interface ChargeWindowResult {
  /** Best-start hour index (0-based, relative to array input). */
  bestStartHour: number;
  /** Best-end hour index (0-based, inclusive). */
  bestEndHour: number;
  /** Hour index with maximum production. */
  peakProductionHour: number;
}

/**
 * Estimate expected hourly DC production (Wh) from basic forecast inputs.
 *
 * Very simplified model:
 *   outputWh ≈ panelWatts × (GHI / 1000) × cloudFactor × tempFactor
 *
 * Where:
 *   - cloudFactor = 1 - cloudCover/100 (clamped 0..1)
 *   - tempFactor  = 1 for ≤ 25 °C, then -0.4 %/°C penalty above 25 °C
 */
export function estimateHourlyProduction(
  panelWatts: number,
  forecast: HourlyForecast,
): number {
  if (!Number.isFinite(panelWatts) || panelWatts <= 0) return 0;

  const irradianceFactor = forecast.ghi <= 0 ? 0 : forecast.ghi / 1000;
  const cloudPenaltyRaw = 1 - forecast.cloudCover / 100;
  const cloudPenalty = clamp01(cloudPenaltyRaw);

  let tempPenalty = 1;
  if (Number.isFinite(forecast.temperatureC) && forecast.temperatureC > 25) {
    const over = forecast.temperatureC - 25;
    tempPenalty = 1 - over * 0.004; // 0.4 % per °C above 25
  }
  tempPenalty = Math.max(0.5, Math.min(1, tempPenalty)); // Never worse than -50 %

  const output = panelWatts * irradianceFactor * cloudPenalty * tempPenalty;
  return output > 0 ? output : 0;
}

/**
 * Simulate battery SOC (%) over a sequence of hours, given production and load.
 *
 * - startingSOC: initial state-of-charge in %
 * - batteryCapacityWh: usable battery capacity (Wh)
 * - hourlyProduction: array of Wh produced each hour
 * - hourlyLoad: array of Wh consumed each hour
 */
export function simulateBatterySOC(
  startingSOC: number,
  batteryCapacityWh: number,
  hourlyProduction: number[],
  hourlyLoad: number[],
): number[] {
  if (!Number.isFinite(batteryCapacityWh) || batteryCapacityWh <= 0) {
    return [];
  }
  if (!Number.isFinite(startingSOC)) startingSOC = 0;

  const len = Math.min(hourlyProduction.length, hourlyLoad.length);
  const socProjection: number[] = [];
  let currentWh = clamp(
    (startingSOC / 100) * batteryCapacityWh,
    0,
    batteryCapacityWh,
  );

  for (let i = 0; i < len; i++) {
    currentWh += hourlyProduction[i] || 0;
    currentWh -= hourlyLoad[i] || 0;
    currentWh = clamp(currentWh, 0, batteryCapacityWh);
    socProjection.push((currentWh / batteryCapacityWh) * 100);
  }

  return socProjection;
}

/**
 * Detect a simple peak harvest window around the hour of maximum production.
 *
 * Returns a 3‑hour band [peak-1, peak, peak+1] clamped to the input range.
 */
export function detectPeakWindow(hourlyProduction: number[]): ChargeWindowResult {
  if (!hourlyProduction.length) {
    return { bestStartHour: 0, bestEndHour: 0, peakProductionHour: 0 };
  }

  let max = -Infinity;
  let peakHour = 0;

  hourlyProduction.forEach((value, index) => {
    const v = Number.isFinite(value) ? value : 0;
    if (v > max) {
      max = v;
      peakHour = index;
    }
  });

  const bestStartHour = clamp(peakHour - 1, 0, hourlyProduction.length - 1);
  const bestEndHour = clamp(peakHour + 1, 0, hourlyProduction.length - 1);

  return {
    bestStartHour,
    bestEndHour,
    peakProductionHour: peakHour,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

