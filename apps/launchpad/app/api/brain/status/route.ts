import { NextResponse } from 'next/server';

// Basic brain status aggregator that talks to the Brain app APIs.

export async function GET() {
  try {
    const brainBase =
      process.env.BRAIN_BASE_URL || 'http://localhost:3006';

    const metricsUrl = `${brainBase}/api/metrics`;
    // Check Brain's overall health - use 'brain' service or check multiple services
    const healthUrl = `${brainBase}/health/brain`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    let metrics: any = null;
    let healthRaw: any = null;
    let healthOk = false;

    try {
      const [mRes, hRes] = await Promise.all([
        fetch(metricsUrl, { signal: controller.signal }),
        fetch(healthUrl, { signal: controller.signal }).catch(() => null), // Health check is optional
      ]);

      if (mRes.ok) {
        metrics = await mRes.json().catch(() => null);
      }

      if (hRes && hRes.ok) {
        healthRaw = await hRes.json().catch(() => null);
        // health route is expected to return { status: "ok" | "degraded" | "down", issues?: [...] }
        healthOk = healthRaw?.status === 'ok';
      }
    } finally {
      clearTimeout(timeout);
    }

    const unhealthyServices =
      metrics?.unhealthyServices && Array.isArray(metrics.unhealthyServices)
        ? metrics.unhealthyServices
        : [];

    const botIssues =
      Array.isArray(healthRaw?.issues) && healthRaw.issues.length > 0
        ? healthRaw.issues
        : [];

    return NextResponse.json({
      ok: true,
      brainReachable: !!metrics || !!healthRaw,
      brainHealthy: healthOk && unhealthyServices.length === 0 && botIssues.length === 0,
      metrics: metrics || null,
      health: {
        status: healthRaw?.status ?? 'unknown',
        issues: botIssues,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // Return 200 with ok: false so launchpad can show "Brain offline" without a failed request
    return NextResponse.json({
      ok: false,
      brainReachable: false,
      brainHealthy: false,
      error: error?.message || 'Failed to reach brain status',
      timestamp: new Date().toISOString(),
    });
  }
}


