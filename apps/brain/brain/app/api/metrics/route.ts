// Brain Metrics API Endpoint
// Returns current metrics from the metrics tracker

import { NextRequest, NextResponse } from 'next/server';
import { getMetricsTracker } from '../../../lib/metrics-tracker';

export async function GET(request: NextRequest) {
  try {
    const metrics = getMetricsTracker();
    const metricsData = metrics.getMetrics();

    // Convert Map to object for JSON serialization
    const services = Object.fromEntries(
      Array.from(metricsData.services.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          lastCheckTime: value.lastCheckTime.toISOString(),
        },
      ])
    );

    return NextResponse.json({
      ...metricsData,
      services,
      unhealthyServices: metrics.getUnhealthyServices().map(s => ({
        ...s,
        lastCheckTime: s.lastCheckTime.toISOString(),
      })),
      topErrors: metrics.getTopErrorTypes(10),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error fetching metrics: ${error.message}` },
      { status: 500 }
    );
  }
}

