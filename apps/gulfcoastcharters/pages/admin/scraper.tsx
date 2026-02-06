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
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [scrapedBoat, setScrapedBoat] = useState<any>(null);
  const [config, setConfig] = useState<ScraperConfig>({
    sources: { thehulltruth: false, craigslist: true, google: true, web_search: true, known_sites: false, facebook: false, instagram: false },
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
        if (resp.ok && json?.config) {
          // Ensure sources object exists and has all expected keys
          const loadedConfig = json.config;
          const defaultSources = {
            thehulltruth: false,
            craigslist: true,
            google: true,
            web_search: true,
            known_sites: false,
            facebook: false,
            instagram: false,
          };
          setConfig({
            ...loadedConfig,
            sources: {
              ...defaultSources,
              ...(loadedConfig.sources || {}),
            },
          });
        }
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

  async function scrapeManualUrl() {
    if (!manualUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setScrapingUrl(true);
    setScrapedBoat(null);
    try {
      console.log('[Manual Scraper] Starting scrape for URL:', manualUrl.trim());
      const resp = await fetch('/api/admin/scraper/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl.trim() }),
      });
      const json = await resp.json();
      console.log('[Manual Scraper] Response:', json);
      
      if (!resp.ok) {
        console.error('[Manual Scraper] Error response:', json);
        throw new Error(json?.error || 'Scraping failed');
      }
      
      if (json.boat) {
        console.log('[Manual Scraper] Boat extracted:', json.boat);
        setScrapedBoat(json);
        toast.success('Boat scraped successfully', {
          description: json.validation?.isComplete ? 'Complete boat data' : `Missing: ${json.validation?.missingFields?.join(', ') || 'some fields'}`,
        });
      } else {
        console.warn('[Manual Scraper] No boat data extracted:', json.error);
        toast.warning('No boat data extracted', {
          description: json.error || 'The URL may not contain boat information',
        });
      }
    } catch (e: any) {
      console.error('[Manual Scraper] Exception:', e);
      toast.error('Scraping failed', { description: String(e?.message || e) });
    } finally {
      setScrapingUrl(false);
    }
  }

  async function saveScrapedBoat() {
    if (!scrapedBoat?.boat) {
      toast.error('No boat data to save');
      return;
    }

    try {
      console.log('[Manual Scraper] Saving boat:', scrapedBoat.boat);
      const resp = await fetch('/api/admin/scraper/save-boat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boat: scrapedBoat.boat }),
      });
      const json = await resp.json();
      console.log('[Manual Scraper] Save response:', json);
      
      if (!resp.ok) throw new Error(json?.error || 'Save failed');
      
      toast.success('Boat saved successfully', {
        description: `Action: ${json.action || 'saved'}, ID: ${json.id || 'N/A'}`,
      });
      setScrapedBoat(null);
      setManualUrl('');
      router.push('/admin/scraper-reports');
    } catch (e: any) {
      console.error('[Manual Scraper] Save error:', e);
      toast.error('Save failed', { description: String(e?.message || e) });
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

        {/* Manual URL Scraper */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Scrape Single URL</h2>
            <p className="text-sm text-gray-900 mb-4">
              Enter a URL to scrape boat information. Useful for adding specific boats or testing URLs.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://example.com/charter-boat"
              className="flex-1 px-3 py-2 rounded border border-gray-200 text-gray-900 placeholder:text-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !scrapingUrl) {
                  void scrapeManualUrl();
                }
              }}
            />
            <button
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
              onClick={() => void scrapeManualUrl()}
              disabled={scrapingUrl || !manualUrl.trim()}
            >
              {scrapingUrl ? 'Scraping…' : 'Scrape URL'}
            </button>
          </div>

          {scrapingUrl && (
            <div className="text-sm text-gray-900">
              <p>Scraping URL... This may take a few seconds.</p>
            </div>
          )}

          {scrapedBoat?.boat && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{scrapedBoat.boat.name || 'Unnamed Boat'}</h3>
                  <p className="text-sm text-gray-900">
                    {scrapedBoat.boat.location || 'Location not found'}
                  </p>
                </div>
                <div className="text-right">
                  {scrapedBoat.validation?.isComplete ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Complete</span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Missing: {scrapedBoat.validation?.missingFields?.join(', ') || 'fields'}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-gray-900">
                {scrapedBoat.boat.captain && (
                  <div>
                    <span className="font-medium text-gray-900">Captain:</span> <span className="text-gray-900">{scrapedBoat.boat.captain}</span>
                  </div>
                )}
                {scrapedBoat.boat.phone && (
                  <div>
                    <span className="font-medium text-gray-900">Phone:</span> <span className="text-gray-900">{scrapedBoat.boat.phone}</span>
                  </div>
                )}
                {scrapedBoat.boat.email && (
                  <div>
                    <span className="font-medium text-gray-900">Email:</span> <span className="text-gray-900">{scrapedBoat.boat.email}</span>
                  </div>
                )}
                {scrapedBoat.boat.boat_type && (
                  <div>
                    <span className="font-medium text-gray-900">Boat Type:</span> <span className="text-gray-900">{scrapedBoat.boat.boat_type}</span>
                  </div>
                )}
                {scrapedBoat.boat.length && (
                  <div>
                    <span className="font-medium text-gray-900">Length:</span> <span className="text-gray-900">{scrapedBoat.boat.length} ft</span>
                  </div>
                )}
                {scrapedBoat.boat.source_url && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-900">Source:</span>{' '}
                    <a href={scrapedBoat.boat.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      {scrapedBoat.boat.source_url}
                    </a>
                  </div>
                )}
              </div>

              {scrapedBoat.boat.description && (
                <div className="text-sm">
                  <span className="font-medium text-gray-900">Description:</span>
                  <p className="text-gray-900 mt-1">{scrapedBoat.boat.description.slice(0, 200)}...</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  onClick={() => void saveScrapedBoat()}
                >
                  Save to Database
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                  onClick={() => {
                    setScrapedBoat(null);
                    setManualUrl('');
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

