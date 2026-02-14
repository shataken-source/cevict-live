import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMonitorHealth(): Promise<{ ok: boolean; latency?: number }> {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3010';
  const start = Date.now();
  try {
    const res = await fetch(`${base}/api/health`, { cache: 'no-store' });
    const ok = res.ok;
    const latency = Date.now() - start;
    return { ok, latency };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

export default async function MonitorStatusPage() {
  const health = await getMonitorHealth();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Monitor status</h1>
      <p className="text-gray-400 mb-8">Website Monitor service health.</p>

      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${health.ok ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">Website Monitor</span>
            <span className={health.ok ? 'text-green-400' : 'text-red-400'}>
              {health.ok ? 'Operational' : 'Down'}
            </span>
          </div>
          {health.latency != null && (
            <p className="text-gray-400 text-sm mt-1">Latency: {health.latency}ms</p>
          )}
        </div>
      </div>

      <p className="text-gray-500 text-sm mt-8">
        <Link href="/" className="text-blue-400 hover:underline">Dashboard</Link>
      </p>
    </div>
  );
}
