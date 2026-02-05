import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';

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

export default function CaptainLiveLocationPage({ session }: { session: any }) {
  const router = useRouter();
  const captainId = useMemo(() => String(router.query.captainId || '').trim(), [router.query.captainId]);
  const [data, setData] = useState<LatestResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'not_sharing' | 'error'>('idle');

  useEffect(() => {
    if (!captainId) return;
    let cancelled = false;

    async function tick() {
      setStatus('loading');
      try {
        const resp = await fetch(`/api/gps/latest?captainId=${encodeURIComponent(captainId)}`);
        if (cancelled) return;
        if (resp.status === 404) {
          setStatus('not_sharing');
          setData(null);
          return;
        }
        if (!resp.ok) {
          setStatus('error');
          setData(null);
          return;
        }
        const json = (await resp.json()) as LatestResponse;
        setData(json);
        setStatus('idle');
      } catch {
        if (cancelled) return;
        setStatus('error');
        setData(null);
      }
    }

    void tick();
    const t = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [captainId]);

  return (
    <Layout session={session}>
      <Head>
        <title>Live Captain Location - Gulf Coast Charters</title>
      </Head>

      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold">Live Boat Location</h1>
        <p className="text-gray-600">Updates every few seconds while the captain is sharing.</p>

        {status === 'loading' ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">Loading…</div>
        ) : null}

        {status === 'not_sharing' ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-700">
            <div className="font-semibold">Not currently sharing</div>
            <div className="mt-1 text-sm text-gray-600">
              This captain has not enabled public location sharing.
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
            <div className="font-semibold">Could not load location</div>
            <div className="mt-1 text-sm">Please refresh and try again.</div>
          </div>
        ) : null}

        {data ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
            <div className="text-sm text-gray-500">Captain: {data.captainId}</div>
            <div className="text-2xl font-mono font-semibold">
              {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
            </div>
            <div className="text-sm text-gray-600">
              Accuracy: {data.accuracyM ?? '—'} m • Speed: {data.speedMps ?? '—'} m/s • Heading: {data.headingDeg ?? '—'}°
            </div>
            <div className="text-xs text-gray-500">
              Last update: {new Date(data.capturedAt).toLocaleString()}
            </div>

            <a
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Google Maps
            </a>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

