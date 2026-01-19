import { NextRequest, NextResponse } from "next/server";
import { getAccuracyMetrics } from "../../../prediction-tracker";

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const metrics = getAccuracyMetrics();
    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error: any) {
    console.error('❌ Error fetching metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
        message: error?.message || 'Unknown error',
        metrics: null
      },
      { status: 500 }
    );
  }
}


