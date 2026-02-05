import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

type Application = {
  id: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
};

export default function ApplyCaptainPage() {
  const router = useRouter();
  const supabase = useMemo(() => createPagesBrowserClient(), []);

  const [userLoaded, setUserLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    location: '',
    uscg_license: '',
    years_experience: '',
    specialties: '',
    bio: '',
    insurance_provider: '',
    insurance_coverage: '',
    insurance_policy_number: '',
  });

  const [application, setApplication] = useState<Application | null>(null);
  const [loadingApp, setLoadingApp] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setUserLoaded(true);
      if (data.user?.email) setEmail(data.user.email);
    });
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    fetchApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchApplication() {
    setLoadingApp(true);
    try {
      const res = await fetch('/api/captain/applications');
      const json = await res.json();
      setApplication(json.application || null);
    } catch {
      setApplication(null);
    } finally {
      setLoadingApp(false);
    }
  }

  async function submitAuth() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (mode === 'sign_in') {
        const res = await supabase.auth.signInWithPassword({ email, password });
        if (res.error) throw res.error;
      } else {
        const res = await supabase.auth.signUp({ email, password });
        if (res.error) throw res.error;
      }
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    } catch (e: any) {
      setAuthError(e?.message || 'Failed');
    } finally {
      setAuthLoading(false);
    }
  }

  async function submitApplication() {
    setSubmitOk(false);
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || undefined,
        location: form.location.trim() || undefined,
        uscg_license: form.uscg_license.trim() || undefined,
        years_experience: form.years_experience ? Number(form.years_experience) : undefined,
        specialties: form.specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        bio: form.bio.trim() || undefined,
        insurance_provider: form.insurance_provider.trim() || undefined,
        insurance_coverage: form.insurance_coverage.trim() || undefined,
        insurance_policy_number: form.insurance_policy_number.trim() || undefined,
      };

      const res = await fetch('/api/captain/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setSubmitOk(true);
      setApplication(json.application || null);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed');
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Apply to be a Captain - Gulf Coast Charters</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => router.push('/')} className="text-blue-600 hover:text-blue-800 mb-4">
            ← Back to Home
          </button>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow">
            <h1 className="text-2xl font-bold text-gray-900">Apply to be a Captain</h1>
            <p className="mt-1 text-sm text-gray-600">
              Submit your application. No mock data — this writes to Supabase and goes to admin review.
            </p>

            {!userLoaded ? (
              <div className="mt-6 text-sm text-gray-600">Loading…</div>
            ) : !user ? (
              <div className="mt-6">
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setMode('sign_in')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                      mode === 'sign_in' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('sign_up')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                      mode === 'sign_up' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    Create account
                  </button>
                </div>

                {authError ? (
                  <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    {authError}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Password</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitAuth();
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={submitAuth}
                    disabled={authLoading || !email || !password}
                    className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold disabled:bg-gray-400"
                  >
                    {authLoading ? 'Working…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Needs Supabase env vars: <code>NEXT_PUBLIC_SUPABASE_URL</code> +{' '}
                  <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                </p>
              </div>
            ) : (
              <div className="mt-6">
                {loadingApp ? (
                  <div className="text-sm text-gray-600">Loading your application…</div>
                ) : application ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Application status</div>
                        <div className="mt-1 text-sm text-gray-700">
                          <span className="font-semibold">{application.status}</span> • Submitted{' '}
                          {new Date(application.created_at).toLocaleString()}
                        </div>
                        {application.admin_notes ? (
                          <div className="mt-2 text-sm text-gray-700">
                            <span className="font-semibold">Admin notes:</span> {application.admin_notes}
                          </div>
                        ) : null}
                      </div>
                      <button
                        className="text-sm text-blue-700 hover:text-blue-900 font-semibold"
                        onClick={() => supabase.auth.signOut().then(() => location.reload())}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {submitError ? (
                      <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                        {submitError}
                      </div>
                    ) : null}
                    {submitOk ? (
                      <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                        Application submitted.
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Full name" required value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
                      <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                      <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
                      <Field label="USCG license #" value={form.uscg_license} onChange={(v) => setForm({ ...form, uscg_license: v })} />
                      <Field label="Years experience" value={form.years_experience} onChange={(v) => setForm({ ...form, years_experience: v })} />
                      <Field
                        label="Specialties (comma-separated)"
                        value={form.specialties}
                        onChange={(v) => setForm({ ...form, specialties: v })}
                      />
                      <Field label="Insurance provider" value={form.insurance_provider} onChange={(v) => setForm({ ...form, insurance_provider: v })} />
                      <Field label="Insurance coverage" value={form.insurance_coverage} onChange={(v) => setForm({ ...form, insurance_coverage: v })} />
                      <Field
                        label="Insurance policy #"
                        value={form.insurance_policy_number}
                        onChange={(v) => setForm({ ...form, insurance_policy_number: v })}
                      />
                      <TextArea label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} />
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                      <button
                        className="text-sm text-blue-700 hover:text-blue-900 font-semibold"
                        onClick={() => supabase.auth.signOut().then(() => location.reload())}
                      >
                        Sign out
                      </button>
                      <button
                        type="button"
                        onClick={submitApplication}
                        disabled={submitLoading || !form.full_name.trim()}
                        className="bg-blue-600 text-white rounded-lg px-5 py-2 font-semibold disabled:bg-gray-400"
                      >
                        {submitLoading ? 'Submitting…' : 'Submit application'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>
      <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="md:col-span-2">
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <textarea
        className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[120px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

