import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getAccuracyMetrics } from "../../../prediction-tracker";

const prognoDir = path.join(process.cwd(), ".progno");

interface CalibrationData {
  spreadBias?: number;
  totalBias?: number;
  confidenceBias?: number;
}

export async function GET() {
  try {
    const calibrationFile = path.join(prognoDir, "calibration.json");
    let calibration: CalibrationData = {};

    if (fs.existsSync(calibrationFile)) {
      try {
        const raw = fs.readFileSync(calibrationFile, "utf8");
        calibration = JSON.parse(raw) || {};
      } catch (err) {
        console.error("Failed to read calibration file:", err);
      }
    }

    // Get metrics to show how calibration was derived
    const metrics = getAccuracyMetrics();

    return NextResponse.json({
      calibration: {
        spreadBias: calibration.spreadBias ?? 0,
        totalBias: calibration.totalBias ?? 0,
        confidenceBias: calibration.confidenceBias ?? 0,
      },
      metrics: {
        totalPredictions: metrics.totalPredictions,
        correctPredictions: metrics.correctPredictions,
        winRate: metrics.winRate,
        averageConfidence: metrics.averageConfidence,
        roi: metrics.roi,
      },
      lastUpdated: fs.existsSync(calibrationFile)
        ? fs.statSync(calibrationFile).mtime.toISOString()
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

