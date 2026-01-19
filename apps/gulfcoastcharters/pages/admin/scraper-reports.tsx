import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import Layout from '../../components/Layout';
import { toast } from 'sonner';

type Report = {
  id: string;
  run_timestamp: string;
  mode: string | null;
  sources: string[] | null;
  total_failures: number;
  total_incomplete: number;
  failures: any[] | null;
  incomplete_boats: any[] | null;
};

export default function AdminScraperReportsPage({ session }: { session: any }) {
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => reports.find((r) => r.id === selectedId) || null, [reports, selectedId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
    });
  }, [router, supabase]);

  async function load() {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/scraper/reports');
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed');
      setReports(json.reports || []);
      if (!selectedId && json.reports?.[0]?.id) setSelectedId(json.reports[0].id);
    } catch (e: any) {
      toast.error('Failed to load reports', { description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadJson(report: Report) {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraper-report-${new Date(report.run_timestamp).toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv(report: Report) {
    const rows = (report.incomplete_boats || []).map((b: any) => ({
      name: b?.name || '',
      location: b?.location || '',
      captain: b?.captain || '',
      phone: b?.phone || '',
      email: b?.email || '',
      boat_type: b?.boat_type || '',
      length: b?.length || '',
      missingFields: Array.isArray(b?.missingFields) ? b.missingFields.join(';') : '',
      source: b?.source || '',
      source_url: b?.source_url || '',
    }));

    const headers = Object.keys(rows[0] || { name: '' });
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String((r as any)[h]).replace(/\"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incomplete-boats-${new Date(report.run_timestamp).toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout session={session}>
      <Head>
        <title>Scraper Failure Reports - Gulf Coast Charters</title>
      </Head>

      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Scraper Failure Reports</h1>
            <p className="text-gray-600">Incomplete/failed listings to review and follow up on.</p>
          </div>
          <div className="flex items-center gap-3">
            <a className="text-sm text-blue-700 underline" href="/admin/scraper">
              Back to scraper
            </a>
            <button
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-700">
            <div className="font-semibold">No reports yet</div>
            <div className="mt-1 text-sm text-gray-600">Run the scraper to generate failure/incomplete reports.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white p-4">
              <div className="font-semibold mb-3">Recent runs</div>
              <div className="space-y-2">
                {reports.map((r) => (
                  <button
                    key={r.id}
                    className={`w-full text-left p-3 rounded-lg border ${
                      r.id === selectedId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <div className="text-sm font-semibold">
                      {new Date(r.run_timestamp).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">
                      Incomplete: {r.total_incomplete} • Failed: {r.total_failures}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              {selected ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-gray-500">
                        Sources: {(selected.sources || []).join(', ') || '—'} • Mode: {selected.mode || '—'}
                      </div>
                      <div className="text-xl font-bold">
                        Incomplete: {selected.total_incomplete} • Failed: {selected.total_failures}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                        onClick={() => downloadJson(selected)}
                      >
                        Download JSON
                      </button>
                      <button
                        className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                        onClick={() => downloadCsv(selected)}
                        disabled={!selected.incomplete_boats || selected.incomplete_boats.length === 0}
                      >
                        Download CSV
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="font-semibold">Incomplete boats</div>
                    {(selected.incomplete_boats || []).length === 0 ? (
                      <div className="text-sm text-gray-600">None.</div>
                    ) : (
                      <div className="space-y-2">
                        {(selected.incomplete_boats || []).slice(0, 50).map((b: any, idx: number) => (
                          <div key={idx} className="rounded-lg border border-gray-200 p-3">
                            <div className="font-semibold">{b?.name || 'Unnamed'}</div>
                            <div className="text-sm text-gray-600">{b?.location || '—'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Missing: {Array.isArray(b?.missingFields) ? b.missingFields.join(', ') : '—'}
                            </div>
                            {b?.source_url ? (
                              <a className="text-sm text-blue-700 underline" href={b.source_url} target="_blank" rel="noreferrer">
                                View source
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-gray-600">Select a report.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

