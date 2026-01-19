import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import Layout from '../../components/Layout';
import { toast } from 'sonner';

type MeResponse = { profileId: string; role: string };

type LatestResponse = {
  captainId: string;
  provider: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  capturedAt: string;
  updateIntervalSeconds: number;
};

export default function AdminGpsPage({ session }: { session: any }) {
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [sharingPublic, setSharingPublic] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [latest, setLatest] = useState<LatestResponse | null>(null);

  const publicUrl = useMemo(() => {
    if (!me?.profileId) return '';
    return `/captains/live/${me.profileId}`;
  }, [me?.profileId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
    });
  }, [router, supabase]);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch('/api/gps/me');
        if (!resp.ok) return;
        const json = (await resp.json()) as MeResponse;
        setMe(json);
      } catch {
        // ignore
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!me?.profileId || !sharingPublic) return;

    const t = setInterval(async () => {
      try {
        const resp = await fetch(`/api/gps/latest?captainId=${encodeURIComponent(me.profileId)}`);
        if (!resp.ok) return;
        const json = (await resp.json()) as LatestResponse;
        setLatest(json);
      } catch {
        // ignore
      }
    }, 4000);

    return () => clearInterval(t);
  }, [me?.profileId, sharingPublic]);

  async function togglePublicShare(next: boolean) {
    setSharingPublic(next);
    try {
      const resp = await fetch('/api/gps/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'browser', sharePublic: next, isActive: true }),
      });
      if (!resp.ok) throw new Error('Failed');
      toast.success(next ? 'Public sharing enabled' : 'Public sharing disabled');
    } catch {
      toast.error('Could not update sharing settings');
      setSharingPublic(!next);
    }
  }

  async function pushOnce() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported in this browser');
      return;
    }

    setPushing(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      const resp = await fetch('/api/gps/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'browser',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? null,
          speedMps: pos.coords.speed ?? null,
          headingDeg: pos.coords.heading ?? null,
          capturedAt: new Date(pos.timestamp).toISOString(),
        }),
      });

      if (!resp.ok) throw new Error('Failed');
      toast.success('Location updated');
    } catch {
      toast.error('Failed to update location (did you enable sharing?)');
    } finally {
      setPushing(false);
    }
  }

  return (
    <Layout session={session}>
      <Head>
        <title>GPS Live Tracking - Gulf Coast Charters</title>
      </Head>

      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold">GPS Live Tracking</h1>
        <p className="text-gray-600">
          This is a minimal “browser GPS” implementation from the restored docs. It lets a captain/admin
          publish their live location and provides a public viewer link.
        </p>

        {!me ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">Loading profile…</div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Profile:</span> {me.profileId} ({me.role})
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={sharingPublic}
                onChange={(e) => void togglePublicShare(e.target.checked)}
              />
              <span className="text-sm">Enable public sharing</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                disabled={!sharingPublic || pushing}
                onClick={() => void pushOnce()}
              >
                {pushing ? 'Updating…' : 'Push location now'}
              </button>

              {publicUrl ? (
                <a className="text-sm text-blue-700 underline" href={publicUrl} target="_blank" rel="noreferrer">
                  Open public viewer
                </a>
              ) : null}
            </div>
          </div>
        )}

        {latest ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
            <div className="font-semibold">Latest public location</div>
            <div className="text-sm text-gray-700 font-mono">
              {latest.latitude.toFixed(6)}, {latest.longitude.toFixed(6)}
            </div>
            <div className="text-sm text-gray-600">
              Accuracy: {latest.accuracyM ?? '—'} m • Speed: {latest.speedMps ?? '—'} m/s • Heading:{' '}
              {latest.headingDeg ?? '—'}°
            </div>
            <div className="text-xs text-gray-500">
              Captured: {new Date(latest.capturedAt).toLocaleString()}
            </div>
            <a
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              href={`https://www.google.com/maps?q=${latest.latitude},${latest.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Google Maps
            </a>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            {sharingPublic ? 'Waiting for a location update…' : 'Enable sharing to see latest location.'}
          </div>
        )}

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
          <div className="font-semibold mb-1">Setup note</div>
          <div>
            This requires the Supabase migration `20260119_gps_live_tracking.sql` to be applied (creates
            `captain_gps_connections` and `captain_location_updates`).
          </div>
        </div>
      </div>
    </Layout>
  );
}

