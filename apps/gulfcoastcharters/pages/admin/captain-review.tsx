import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

type CaptainApplication = {
  id: string;
  captain_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  uscg_license: string | null;
  years_experience: number | null;
  specialties: string[] | null;
  bio: string | null;
  insurance_provider: string | null;
  insurance_coverage: string | null;
  insurance_policy_number: string | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
};

export default function CaptainReviewAdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createPagesBrowserClient(), []);

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [apps, setApps] = useState<CaptainApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CaptainApplication | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
      else fetchApps();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase, statusFilter]);

  async function fetchApps() {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await fetch(`/api/admin/captain-applications${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setApps(json.applications || []);
      setSelected(null);
      setActionNotes('');
    } catch (e: any) {
      setError(e?.message || 'Failed');
      setApps([]);
    } finally {
      setLoading(false);
    }
  }

  async function review(applicationId: string, status: 'under_review' | 'approved' | 'rejected') {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/captain-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status, adminNotes: actionNotes || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      await fetchApps();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>Captain Applications - Admin - Gulf Coast Charters</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <button onClick={() => router.push('/admin')} className="text-blue-600 hover:text-blue-800 mb-2">
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Captain Applications</h1>
              <p className="text-sm text-gray-600">Review, approve, or reject captain onboarding applications.</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Status</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="pending">pending</option>
                <option value="under_review">under_review</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
              <button
                type="button"
                onClick={fetchApps}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 font-semibold"
              >
                Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="font-semibold text-gray-900">Applications</div>
                  <div className="text-xs text-gray-500">{apps.length} result(s)</div>
                </div>
                <div className="divide-y">
                  {loading ? (
                    <div className="p-4 text-sm text-gray-600">Loading…</div>
                  ) : apps.length === 0 ? (
                    <div className="p-4 text-sm text-gray-600">No applications.</div>
                  ) : (
                    apps.map((a) => (
                      <button
                        key={a.id}
                        className={`w-full text-left p-4 hover:bg-gray-50 ${
                          selected?.id === a.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setSelected(a);
                          setActionNotes(a.admin_notes || '');
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{a.full_name}</div>
                            <div className="text-xs text-gray-600 truncate">{a.email}</div>
                            <div className="text-xs text-gray-500">
                              {a.location ? a.location : 'No location'} • {new Date(a.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-800">
                            {a.status}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {!selected ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-gray-600">
                  Select an application to review.
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selected.full_name}</h2>
                        <div className="text-sm text-gray-600">{selected.email}</div>
                        <div className="text-sm text-gray-600">
                          {selected.phone ? selected.phone : 'No phone'} • {selected.location ? selected.location : 'No location'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Status</div>
                        <div className="font-semibold">{selected.status}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Info label="USCG license" value={selected.uscg_license} />
                    <Info label="Years experience" value={selected.years_experience?.toString() || null} />
                    <Info label="Insurance provider" value={selected.insurance_provider} />
                    <Info label="Insurance coverage" value={selected.insurance_coverage} />
                    <Info label="Policy #" value={selected.insurance_policy_number} />
                    <Info label="Specialties" value={selected.specialties?.join(', ') || null} />
                    <div className="md:col-span-2">
                      <div className="text-xs text-gray-500">Bio</div>
                      <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                        {selected.bio ? selected.bio : '—'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-gray-500">Admin notes</div>
                      <textarea
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[120px]"
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Optional notes (shown to applicant)"
                      />
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                    <button
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
                      disabled={saving}
                      onClick={() => review(selected.id, 'under_review')}
                    >
                      Mark under review
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold disabled:bg-gray-400"
                      disabled={saving}
                      onClick={() => review(selected.id, 'rejected')}
                    >
                      Reject
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold disabled:bg-gray-400"
                      disabled={saving}
                      onClick={() => review(selected.id, 'approved')}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{value ? value : '—'}</div>
    </div>
  );
}

