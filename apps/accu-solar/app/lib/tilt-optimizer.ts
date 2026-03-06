/**
 * Tilt optimization utilities for Accu-Solar.
 *
 * All math here is deterministic and based on simple rule-of-thumb formulas.
 * No LLMs are involved in any calculation; AI can only use the outputs
 * (tilt profiles, gains, ROI) to explain or contextualize them.
 *
 * See docs/ACCU_SOLAR_COMMAND_CORE_ARCHITECTURE.md for the surrounding design.
 */

export interface TiltProfile {
  /** Best fixed tilt for annual energy (deg from horizontal). */
  annualOptimal: number;
  /** Winter-biased tilt (higher angle to better capture low sun). */
  winterOptimal: number;
  /** Summer-biased tilt (flatter angle to reduce high‑sun losses). */
  summerOptimal: number;
  /** Spring/Fall compromise (usually ≈ latitude). */
  springFallOptimal: number;
}

/**
 * Calculate simple tilt profiles from latitude (Northern Hemisphere rule-of-thumb).
 *
 * Formulas:
 *  - Annual:      latitude * 0.76 + 3.1
 *  - Winter:      latitude + 15
 *  - Summer:      latitude - 15
 *  - Spring/Fall: latitude
 *
 * Values are rounded to whole degrees and clamped to [0, 90].
 */
export function calculateTiltProfiles(latitude: number): TiltProfile {
  if (!Number.isFinite(latitude)) {
    throw new Error("Latitude must be a finite number.");
  }

  const annual = latitude * 0.76 + 3.1;
  const winter = latitude + 15;
  const summer = latitude - 15;
  const springFall = latitude;

  return {
    annualOptimal: roundToValidTilt(annual),
    winterOptimal: roundToValidTilt(winter),
    summerOptimal: roundToValidTilt(summer),
    springFallOptimal: roundToValidTilt(springFall),
  };
}

function roundToValidTilt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  return Math.max(0, Math.min(90, rounded));
}

export type AdjustmentType = "TWICE_YEARLY" | "SEASONAL";

/**
 * Estimate additional annual production from adjustable tilt.
 *
 * Based on conservative industry heuristics:
 *  - TWICE_YEARLY (summer/winter)   → ~6% gain
 *  - SEASONAL (4x per year)        → ~10% gain
 */
export function estimateAdjustableGain(
  annualProductionKWh: number,
  adjustmentType: AdjustmentType,
): { gainPercent: number; additionalKWh: number } {
  if (!Number.isFinite(annualProductionKWh) || annualProductionKWh <= 0) {
    return { gainPercent: 0, additionalKWh: 0 };
  }

  const gainRate = adjustmentType === "SEASONAL" ? 0.1 : 0.06;
  const additionalKWh = annualProductionKWh * gainRate;

  return {
    gainPercent: gainRate * 100,
    additionalKWh: Math.round(additionalKWh),
  };
}

/**
 * Simple ROI model for adjustable mounts.
 *
 * Given:
 *  - installCost: one-time cost of adjustable racking
 *  - electricityValuePerKWh: blended value of 1 kWh (utility rate or avoided diesel)
 *  - additionalKWh: annual extra energy from better tilt
 *
 * Returns:
 *  - annualValue: approximate monetary gain per year (rounded)
 *  - paybackYears: installCost / annualValue (1 decimal; Infinity if annualValue ≈ 0)
 */
export function calculateTiltROI(
  installCost: number,
  electricityValuePerKWh: number,
  additionalKWh: number,
): { annualValue: number; paybackYears: number } {
  if (!Number.isFinite(installCost) || installCost <= 0) {
    return { annualValue: 0, paybackYears: 0 };
  }
  if (!Number.isFinite(electricityValuePerKWh) || electricityValuePerKWh <= 0) {
    return { annualValue: 0, paybackYears: Number.POSITIVE_INFINITY };
  }
  if (!Number.isFinite(additionalKWh) || additionalKWh <= 0) {
    return { annualValue: 0, paybackYears: Number.POSITIVE_INFINITY };
  }

  const annualValueRaw = additionalKWh * electricityValuePerKWh;
  const annualValue = Math.round(annualValueRaw);
  if (annualValue <= 0) {
    return { annualValue: 0, paybackYears: Number.POSITIVE_INFINITY };
  }

  const paybackYears = installCost / annualValueRaw;
  return {
    annualValue,
    paybackYears: Number.isFinite(paybackYears)
      ? Number(paybackYears.toFixed(1))
      : Number.POSITIVE_INFINITY,
  };
}

