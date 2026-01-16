'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw } from '@/components/ui/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type LostPetMatchRow = {
  id: string;
  source_pet_id: string;
  matched_pet_id: string;
  match_score: number; // 0..1
  match_reasons: string[] | null;
  status: string;
  created_at: string;
  source?: any;
  matched?: any;
};

type PreRegMatchRow = {
  id: string;
  pre_registered_pet_id: string;
  found_pet_id: string;
  match_score: number; // 0..1
  match_reasons: string[] | null;
  status: string;
  created_at: string;
  pre?: any;
  found?: any;
};

function pct(score: number) {
  if (typeof score !== 'number' || Number.isNaN(score)) return '0%';
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

export default function AdminMatchesPage() {
  const [loading, setLoading] = useState(true);
  const [lostFoundMatches, setLostFoundMatches] = useState<LostPetMatchRow[]>([]);
  const [preRegMatches, setPreRegMatches] = useState<PreRegMatchRow[]>([]);
  const [preRegTableMissing, setPreRegTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        fetch('/api/admin/matches?limit=100').then((r) => r.json()),
        fetch('/api/admin/pre-registered-matches?limit=100').then((r) => r.json()),
      ]);

      if (a?.success) setLostFoundMatches(a.matches || []);
      else throw new Error(a?.error || 'Failed to load lost/found matches');

      if (b?.success) {
        setPreRegMatches(b.matches || []);
        setPreRegTableMissing(Boolean(b.tableMissing));
      } else {
        // If the table doesn't exist yet, keep page usable.
        const msg = String(b?.error || '');
        if (msg.includes('does not exist')) {
          setPreRegTableMissing(true);
          setPreRegMatches([]);
        } else {
          throw new Error(b?.error || 'Failed to load pre-registered matches');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Matches</h1>
            <p className="text-gray-600">Review candidate matches and take action (confirm/reject coming next).</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline">Back</Button>
            </Link>
            <Button onClick={load} variant="outline" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        ) : null}

        {preRegTableMissing ? (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-900">
              Pre-registration tables not found. Run the Supabase migration:{' '}
              <code className="px-2 py-1 rounded bg-white border">apps/petreunion/supabase/migrations/20260115_pre_registration.sql</code>
            </AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="lost-found">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lost-found">Lost ↔ Found</TabsTrigger>
            <TabsTrigger value="pre-registered">Pre-registered ↔ Found</TabsTrigger>
          </TabsList>

          <TabsContent value="lost-found">
            <Card>
              <CardHeader>
                <CardTitle>Lost ↔ Found Matches</CardTitle>
                <CardDescription>Data source: `lost_pet_matches`</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-10 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : lostFoundMatches.length === 0 ? (
                  <Alert>
                    <AlertDescription>No matches yet.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {lostFoundMatches.slice(0, 50).map((m) => (
                      <div key={m.id} className="rounded-lg border bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="font-semibold">
                              Score: <Badge>{pct(m.match_score)}</Badge> <Badge variant="secondary">{m.status}</Badge>
                            </div>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Lost:</span> {m.source?.pet_name || m.source_pet_id} •{' '}
                              {m.source?.location_city || '—'},{m.source?.location_state || '—'} • {m.source?.breed || '—'} •{' '}
                              {m.source?.color || '—'}
                            </div>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Found:</span> {m.matched?.pet_name || m.matched_pet_id} •{' '}
                              {m.matched?.location_city || '—'},{m.matched?.location_state || '—'} • {m.matched?.breed || '—'} •{' '}
                              {m.matched?.color || '—'}
                            </div>
                            {m.match_reasons?.length ? (
                              <div className="text-xs text-gray-500">Reasons: {m.match_reasons.join(', ')}</div>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pre-registered">
            <Card>
              <CardHeader>
                <CardTitle>Pre-registered ↔ Found Matches</CardTitle>
                <CardDescription>Data source: `pre_registered_pet_matches`</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-10 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : preRegMatches.length === 0 ? (
                  <Alert>
                    <AlertDescription>No matches yet.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {preRegMatches.slice(0, 50).map((m) => (
                      <div key={m.id} className="rounded-lg border bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="font-semibold">
                              Score: <Badge>{pct(m.match_score)}</Badge> <Badge variant="secondary">{m.status}</Badge>
                            </div>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Pre-registered:</span> {m.pre?.pet_name || m.pre_registered_pet_id} •{' '}
                              {m.pre?.location_city || '—'},{m.pre?.location_state || '—'} • {m.pre?.breed || '—'} • {m.pre?.color || '—'}
                            </div>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Found:</span> {m.found?.pet_name || m.found_pet_id} •{' '}
                              {m.found?.location_city || '—'},{m.found?.location_state || '—'} • {m.found?.breed || '—'} • {m.found?.color || '—'}
                            </div>
                            {m.match_reasons?.length ? (
                              <div className="text-xs text-gray-500">Reasons: {m.match_reasons.join(', ')}</div>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

