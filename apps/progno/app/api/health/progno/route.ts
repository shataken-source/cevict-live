import { NextResponse } from "next/server";
import { getAccuracyMetrics } from "../../../prediction-tracker";

export async function GET() {
  try {
    const metrics = getAccuracyMetrics();
    return NextResponse.json({
      status: "ok",
      service: "progno",
      totalPredictions: metrics.totalPredictions,
      winRate: metrics.winRate,
      roi: metrics.roi,
      averageConfidence: metrics.averageConfidence,
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


