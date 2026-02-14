import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function StatusPageBySlug({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const supabase = createSupabaseServiceClient();
  const { data: account } = await supabase
    .from('monitor_accounts')
    .select('user_id')
    .eq('status_page_slug', slug)
    .maybeSingle();

  if (!account?.user_id) notFound();

  const { data: sites } = await supabase
    .from('monitored_websites')
    .select('id, name, url, enabled')
    .eq('owner_id', account.user_id)
    .order('name');

  const siteIds = (sites ?? []).map((s) => s.id);
  const latestChecks: Record<string, { status: string; response_time: number | null }> = {};
  if (siteIds.length > 0) {
    const { data: checks } = await supabase
      .from('uptime_checks')
      .select('website_id, status, response_time')
      .in('website_id', siteIds)
      .order('checked_at', { ascending: false });
    const seen = new Set<string>();
    for (const c of checks ?? []) {
      if (!seen.has(c.website_id)) {
        seen.add(c.website_id);
        latestChecks[c.website_id] = { status: c.status, response_time: c.response_time };
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Status</h1>
      <p className="text-gray-400 mb-6">Public status page for monitored sites.</p>

      <div className="space-y-4">
        {(sites ?? []).map((site) => {
          const check = latestChecks[site.id];
          const status = check?.status ?? 'unknown';
          const isUp = status === 'up';
          return (
            <div
              key={site.id}
              className={`p-4 rounded-lg border ${isUp ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{site.name}</span>
                <span className={isUp ? 'text-green-400' : 'text-red-400'}>
                  {status === 'up' ? 'Operational' : status === 'down' ? 'Down' : 'Slow'}
                </span>
              </div>
              {check?.response_time != null && (
                <p className="text-gray-400 text-sm mt-1">Response: {check.response_time}ms</p>
              )}
            </div>
          );
        })}
      </div>

      {(!sites || sites.length === 0) && (
        <p className="text-gray-500">No sites configured for this status page.</p>
      )}

      <p className="text-gray-500 text-sm mt-8">
        <Link href="https://cevict.ai" className="text-blue-400 hover:underline">cevict.ai</Link>
        {' · Website Monitor'}
      </p>
    </div>
  );
}
