import type { Telemetry } from "./telemetry-types";
import {
  calculateSolarImpactScore,
  classifyImpact,
  getImpactLabel,
  type WeatherSnapshotInput,
} from "./solar-impact";
import { calculateTiltProfiles } from "./tilt-optimizer";

export type RecommendationSeverity = "info" | "warning" | "critical";

export interface Recommendation {
  id: string;
  title: string;
  severity: RecommendationSeverity;
  score: number;
  body: string;
  tags: string[];
}

export interface RecommendationInput {
  telemetry: Telemetry | null;
  weather: WeatherSnapshotInput | null;
  latitude?: number;
  locationName?: string;
}

function pushIf<T>(
  list: T[],
  cond: boolean,
  value: () => T,
): void {
  if (cond) list.push(value());
}

export function generateRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const { telemetry, weather, latitude, locationName } = input;
  const recs: Recommendation[] = [];

  // Guard: no data yet
  if (!telemetry && !weather) {
    return [];
  }

  // ---------------------------------------------------------------------------
  // Weather / solar impact
  // ---------------------------------------------------------------------------
  if (weather) {
    const impactScore = calculateSolarImpactScore({
      cloudCover: weather.cloudCover ?? 0,
      temperatureC: weather.temperatureC ?? 20,
      snowDepthCm: weather.snowDepthCm,
      airQualityIndex: weather.airQualityIndex,
    });
    const cls = classifyImpact(impactScore);
    const label = getImpactLabel(cls);

    pushIf(recs, true, () => ({
      id: "solar-impact",
      title: `Solar conditions: ${label}`,
      severity: impactScore >= 60 ? "info" : "warning",
      score: impactScore,
      body:
        impactScore >= 85
          ? "Conditions are excellent for charging. If you need to top off your batteries or run heavier loads, today is a good candidate."
          : impactScore >= 60
            ? "Conditions are decent but not perfect. Plan critical charging earlier in the day and avoid large new loads late in the evening."
            : "Solar conditions are weak. Avoid adding new loads, and consider conserving battery capacity for overnight use.",
      tags: ["weather", "solar-impact"],
    }));
  }

  // ---------------------------------------------------------------------------
  // Battery state-of-charge and temperature
  // ---------------------------------------------------------------------------
  if (telemetry) {
    const soc = telemetry.battery_soc_pct;
    const temp = telemetry.battery_temp_c;

    // Low SOC warnings
    pushIf(
      recs,
      soc <= 40,
      () => ({
        id: "soc-low",
        title: soc <= 20 ? "Battery very low" : "Battery getting low",
        severity: soc <= 20 ? "critical" : "warning",
        score: 100 - soc,
        body:
          soc <= 20
            ? "Battery state-of-charge is very low. Avoid heavy loads and plan a full charge cycle as soon as conditions allow."
            : "Battery state-of-charge is trending low. Try to avoid new non-essential loads until you get a solid charging window.",
        tags: ["battery", "soc"],
      }),
    );

    // Temperature warnings (rough ranges for LiFePO4 / lead-acid safety)
    pushIf(
      recs,
      temp <= 0,
      () => ({
        id: "temp-cold",
        title: "Battery temperature at or below freezing",
        severity: "critical",
        score: 95,
        body:
          "Charging batteries at or below 0°C can reduce lifespan or cause damage, especially for LiFePO4. If possible, reduce charge current or warm the battery bank before bulk charging.",
        tags: ["battery", "temperature"],
      }),
    );

    pushIf(
      recs,
      temp > 40,
      () => ({
        id: "temp-hot",
        title: "Battery running hot",
        severity: "warning",
        score: temp,
        body:
          "Battery temperature is elevated. Check ventilation around the bank and avoid sustained high discharge or charge currents.",
        tags: ["battery", "temperature"],
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Tilt guidance from latitude
  // ---------------------------------------------------------------------------
  if (typeof latitude === "number" && Number.isFinite(latitude)) {
    const profiles = calculateTiltProfiles(latitude);
    const locLabel = locationName ? `at ${locationName}` : "for your site";

    pushIf(recs, true, () => ({
      id: "tilt-profile",
      title: "Suggested tilt angles by season",
      severity: "info",
      score: 70,
      body: [
        `Based on your latitude ${locLabel}, a good starting point is:`,
        `• Annual fixed tilt: ~${profiles.annualOptimal}°`,
        `• Winter tilt (more upright): ~${profiles.winterOptimal}°`,
        `• Summer tilt (flatter): ~${profiles.summerOptimal}°`,
        "",
        "If your racking allows adjustments a couple of times per year, switching between winter and summer angles can noticeably improve yearly production.",
      ].join("\n"),
      tags: ["tilt", "seasonal"],
    }));
  }

  // ---------------------------------------------------------------------------
  // Simple ROI hint for adjustable mounts (pure heuristics)
  // ---------------------------------------------------------------------------
  if (telemetry) {
    const dailyKWh = telemetry.daily_solar_kwh;
    if (dailyKWh > 0) {
      const annualKWh = dailyKWh * 365;
      // Simple heuristic: seasonal adjustment ~10% gain
      const extraKWh = Math.round(annualKWh * 0.1);
      const rate = 0.14;
      const extraValue = Math.round(extraKWh * rate);

      pushIf(recs, extraKWh > 0 && extraValue > 0, () => ({
        id: "tilt-roi",
        title: "Potential gain from adjustable tilt",
        severity: "info",
        score: 60,
        body: `If you can adjust your array tilt seasonally, you could capture roughly ${extraKWh.toLocaleString()} extra kWh/year at current production levels (~$${extraValue.toLocaleString()} at $${rate.toFixed(2)}/kWh). Use this as a rough guide when comparing fixed vs adjustable racking costs.`,
        tags: ["tilt", "roi"],
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Sort by severity and score
  // ---------------------------------------------------------------------------
  const severityRank: Record<RecommendationSeverity, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return recs
    .sort((a, b) => {
      const sa = severityRank[a.severity];
      const sb = severityRank[b.severity];
      if (sa !== sb) return sb - sa;
      return (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, 8);
}
