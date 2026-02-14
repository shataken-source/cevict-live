export type HourlySeries = {
  time: string[];
  shortwave_radiation?: number[];
  cloud_cover?: number[];
  precipitation_probability?: number[];
  wind_speed_10m?: number[];
  temperature_2m?: number[];
};

export type ChargeWindow = {
  start: string;
  end: string;
  score: number; // 0..1
  reason: string;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function safeAt(arr: number[] | undefined, idx: number) {
  if (!arr) return undefined;
  const v = arr[idx];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function solarScoreAt(series: HourlySeries, idx: number) {
  const rad = safeAt(series.shortwave_radiation, idx);
  const cloud = safeAt(series.cloud_cover, idx);
  const precipP = safeAt(series.precipitation_probability, idx);

  const radScore = rad == null ? 0.35 : clamp01(rad / 900);
  const cloudScore =
    cloud == null ? 0.6 : clamp01(1 - Math.max(0, Math.min(100, cloud)) / 100);
  const precipScore =
    precipP == null
      ? 0.85
      : clamp01(1 - Math.max(0, Math.min(100, precipP)) / 100);

  return clamp01(0.58 * radScore + 0.30 * cloudScore + 0.12 * precipScore);
}

export function computeBestChargeWindows(
  series: HourlySeries,
  nowIso?: string,
): ChargeWindow[] {
  if (!series.time?.length) return [];
  const now = nowIso ? new Date(nowIso).getTime() : Date.now();

  const points = series.time.map((t, i) => {
    const ts = new Date(t).getTime();
    const score = solarScoreAt(series, i);
    return { t, ts, score };
  });

  const future = points.filter((p) => Number.isFinite(p.ts) && p.ts >= now);
  if (!future.length) return [];

  const threshold = 0.72;
  const windows: ChargeWindow[] = [];

  let startIdx = -1;
  for (let i = 0; i < future.length; i++) {
    const ok = future[i].score >= threshold;
    if (ok && startIdx === -1) startIdx = i;
    if ((!ok || i === future.length - 1) && startIdx !== -1) {
      const endIdx = ok && i === future.length - 1 ? i : i - 1;
      const slice = future.slice(startIdx, endIdx + 1);
      const avg = slice.reduce((a, b) => a + b.score, 0) / slice.length;
      const start = slice[0].t;
      const end = slice[slice.length - 1].t;
      windows.push({
        start,
        end,
        score: clamp01(avg),
        reason: "High irradiance with lower cloud/precip probability",
      });
      startIdx = -1;
    }
  }

  return windows
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
