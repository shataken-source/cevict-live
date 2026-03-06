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
  /** Irradiance in W/m² (GHI/POA) */
  irradiance?: number;
  /** Humidity 0–100% */
  humidity?: number;
  /** UV Index 0–11+ */
  uvIndex?: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute solar impact score 0–100 from current weather.
 * MASTER DIRECTIVE FORMULA:
 * score = ((1 - cloudCover/100) * 0.5 + (irradiance/1000) * 0.3 + (1 - humidity/100) * 0.1 + (uvIndex/10) * 0.1) * 100
 */
export function calculateSolarImpactScore(weather: WeatherSnapshotInput): number {
  const cloudFactor = (1 - (weather.cloudCover ?? 0) / 100) * 0.5;
  const irradianceFactor = ((weather.irradiance ?? 800) / 1000) * 0.3;
  const humidityFactor = (1 - (weather.humidity ?? 50) / 100) * 0.1;
  const uvFactor = ((weather.uvIndex ?? 5) / 10) * 0.1;

  const score = (cloudFactor + irradianceFactor + humidityFactor + uvFactor) * 100;

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
