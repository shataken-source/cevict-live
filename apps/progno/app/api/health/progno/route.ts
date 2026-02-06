import { NextResponse } from "next/server";
import { getAccuracyMetrics } from "../../../prediction-tracker";
import { getPrimaryKey } from "../../../keys-store";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const metrics = getAccuracyMetrics();
    const oddsApi = await checkOddsApiConnectivity();
    return NextResponse.json({
      status: "ok",
      service: "progno",
      totalPredictions: metrics.totalPredictions,
      winRate: metrics.winRate,
      roi: metrics.roi,
      averageConfidence: metrics.averageConfidence,
      oddsApi,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        service: "progno",
        error: error?.message || "health check failed"
      },
      { status: 500 }
    );
  }
}

async function checkOddsApiConnectivity(): Promise<{ ok: boolean; message?: string }> {
  const key = getPrimaryKey();
  if (!key) {
    return { ok: false, message: "ODDS_API_KEY not configured" };
  }
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${key}&regions=us&markets=h2h&oddsFormat=american`
    );
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Invalid or expired API key" };
    }
    if (res.status === 429) {
      return { ok: false, message: "Rate limit exceeded" };
    }
    if (!res.ok) {
      return { ok: false, message: `Odds API ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}


