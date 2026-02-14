/**
 * Solar Impact Scoring Engine (v1).
 * Single 0–100 metric from weather; used for dashboard card and future AI reasoning.
 * See docs/ACCU_SOLAR_COMMAND_CORE_ARCHITECTURE.md.
 */

export interface WeatherSnapshotInput {
  /** Cloud cover 0–100 */
  cloudCover: number;
  /** Air temperature °C */
  temperatureC: number;
  /** Snow depth cm (optional) */
  snowDepthCm?: number;
  /** AQI 0–500+ (optional) */
  airQualityIndex?: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute solar impact score 0–100 from current weather.
 * Penalties: cloud, heat above ~25°C, snow, AQI.
 */
export function calculateSolarImpactScore(weather: WeatherSnapshotInput): number {
  let score = 100;

  score -= (weather.cloudCover ?? 0) * 0.4;

  if (weather.temperatureC > 25) {
    score -= (weather.temperatureC - 25) * 0.8;
  }

  score -= (weather.snowDepthCm ?? 0) * 5;

  if (weather.airQualityIndex != null && weather.airQualityIndex > 0) {
    score -= weather.airQualityIndex * 0.05;
  }

  return clamp(score, 0, 100);
}

export type ImpactClassification = "OPTIMAL" | "MODERATE" | "REDUCED" | "POOR";

export function classifyImpact(score: number): ImpactClassification {
  if (score >= 85) return "OPTIMAL";
  if (score >= 60) return "MODERATE";
  if (score >= 30) return "REDUCED";
  return "POOR";
}

/** Label for UI (🟢 Optimal Charging, etc.) */
export function getImpactLabel(classification: ImpactClassification): string {
  switch (classification) {
    case "OPTIMAL":
      return "Optimal Charging";
    case "MODERATE":
      return "Reduced Output";
    case "REDUCED":
      return "Reduced Output";
    case "POOR":
      return "Poor Solar Conditions";
    default:
      return "Unknown";
  }
}
