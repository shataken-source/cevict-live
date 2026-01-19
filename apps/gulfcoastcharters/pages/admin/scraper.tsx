import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import Layout from '../../components/Layout';
import { toast } from 'sonner';

type ScraperConfig = {
  sources: Record<string, boolean>;
  filters: { states?: string[] };
  schedule: any;
  max_boats_per_run: number;
};

export default function AdminScraperPage({ session }: { session: any }) {
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState<ScraperConfig>({
    sources: { thehulltruth: true, craigslist: true, google: false, facebook: false, instagram: false },
    filters: { states: ['AL', 'FL', 'MS', 'LA', 'TX'] },
    schedule: { enabled: false },
    max_boats_per_run: 10,
  });

  const sourcesEnabled = useMemo(() => Object.entries(config.sources).filter(([, v]) => v).map(([k]) => k), [config.sources]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
    });
  }, [router, supabase]);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch('/api/admin/scraper/config');
        const json = await resp.json();
        if (resp.ok && json?.config) setConfig(json.config);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function save() {
    try {
      const resp = await fetch('/api/admin/scraper/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!resp.ok) throw new Error('Failed');
      toast.success('Saved scraper config');
    } catch {
      toast.error('Could not save config');
    }
  }

  async function runNow() {
    setRunning(true);
    try {
      const resp = await fetch('/api/admin/scraper/run', { method: 'POST' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Run failed');
      toast.success('Scraper run complete', {
        description: `Saved: ${json?.result?.summary?.saved ?? 0}, Incomplete: ${json?.result?.summary?.incomplete ?? 0}`,
      });
      router.push('/admin/scraper-reports');
    } catch (e: any) {
      toast.error('Scraper run failed', { description: String(e?.message || e) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Layout session={session}>
      <Head>
        <title>Scraper Admin - Gulf Coast Charters</title>
      </Head>

      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Scraper</h1>
            <p className="text-gray-600">
              Configure and run the enhanced scraper. This requires deploying the Supabase Edge Function
              `enhanced-smart-scraper` and applying migration `20260119_scraper_core.sql`.
            </p>
          </div>
          <button
            className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-50"
            onClick={() => void runNow()}
            disabled={running || loading}
          >
            {running ? 'Running…' : 'Run now'}
          </button>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">Loading…</div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
            <div>
              <div className="font-semibold mb-2">Sources</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {Object.keys(config.sources).map((k) => (
                  <label key={k} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(config.sources[k])}
                      onChange={(e) => setConfig((c) => ({ ...c, sources: { ...c.sources, [k]: e.target.checked } }))}
                    />
                    <span className="capitalize">{k}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">Enabled: {sourcesEnabled.join(', ') || 'none'}</div>
            </div>

            <div>
              <div className="font-semibold mb-2">Max boats per run</div>
              <input
                type="number"
                min={1}
                max={100}
                value={config.max_boats_per_run}
                onChange={(e) => setConfig((c) => ({ ...c, max_boats_per_run: Number(e.target.value || 10) }))}
                className="w-40 px-3 py-2 rounded border border-gray-200"
              />
            </div>

            <div>
              <div className="font-semibold mb-2">States</div>
              <input
                type="text"
                value={(config.filters.states || []).join(', ')}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    filters: { ...c.filters, states: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) },
                  }))
                }
                className="w-full px-3 py-2 rounded border border-gray-200"
                placeholder="AL, FL, MS, LA, TX"
              />
              <div className="text-xs text-gray-500 mt-1">Used as a best-effort filter.</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                onClick={() => void save()}
              >
                Save config
              </button>
              <a className="text-sm text-blue-700 underline" href="/admin/scraper-reports">
                View failure reports
              </a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

