import { NextResponse } from "next/server";

export const runtime = "edge";

type Input = {
  locationLabel?: string;
  current?: {
    temperatureC?: number;
    windKph?: number;
    cloudCoverPct?: number;
  };
  today?: {
    shortwaveRadiationSum?: number;
    precipitationSumMm?: number;
    uvIndexMax?: number;
  };
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function scoreSolarPotential(input: Input) {
  const cloud = input.current?.cloudCoverPct;
  const radiation = input.today?.shortwaveRadiationSum;
  const precip = input.today?.precipitationSumMm;

  const cloudScore =
    cloud == null ? 0.5 : clamp01(1 - Math.max(0, Math.min(100, cloud)) / 100);
  const radScore =
    radiation == null ? 0.5 : clamp01(radiation / 25000); // rough scale
  const precipScore =
    precip == null ? 0.5 : clamp01(1 - Math.min(20, Math.max(0, precip)) / 20);

  const score = 0.5 * radScore + 0.35 * cloudScore + 0.15 * precipScore;
  return clamp01(score);
}

function band(score: number) {
  if (score >= 0.75) return "excellent";
  if (score >= 0.55) return "good";
  if (score >= 0.35) return "fair";
  return "poor";
}

export async function POST(request: Request) {
  let input: Input | undefined;
  try {
    input = (await request.json()) as Input;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const score = scoreSolarPotential(input);
  const quality = band(score);
  const location = input.locationLabel?.trim();

  const parts: string[] = [];
  parts.push(
    location ? `Solar outlook for ${location}: ${quality}.` : `Solar outlook: ${quality}.`,
  );

  if (input.current?.cloudCoverPct != null) {
    parts.push(`Cloud cover ~${Math.round(input.current.cloudCoverPct)}%.`);
  }
  if (input.today?.precipitationSumMm != null) {
    parts.push(
      `Precip today ~${input.today.precipitationSumMm.toFixed(1)} mm.`,
    );
  }
  if (input.today?.uvIndexMax != null) {
    parts.push(`UV max ~${input.today.uvIndexMax.toFixed(0)}.`);
  }

  return NextResponse.json(
    { summary: parts.join(" "), score, quality, model: "rule-based" },
    { status: 200 },
  );
}
