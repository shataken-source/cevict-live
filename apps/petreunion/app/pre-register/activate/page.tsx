'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useState } from 'react';

export default function ActivatePreRegisteredMissingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const [form, setForm] = useState({
    preRegisteredId: '',
    owner_email: '',
    owner_phone: '',
    date_lost: '',
    location_city: '',
    location_state: '',
    location_zip: '',
    location_detail: '',
    notes: '',
  });

  async function submit() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/petreunion/pre-register/activate-missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed');
      setSuccess(data);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My pet is missing</h1>
            <p className="text-gray-600">Activate a pre-registered profile into a public “lost” listing + start matching.</p>
          </div>
          <Link href="/pre-register">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              Activated. Created lost pet ID: <code className="px-2 py-1 rounded bg-white border">{success.lostPetId}</code>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Activation</CardTitle>
            <CardDescription>We verify ownership via the email or phone used during pre-registration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pre-registration ID</Label>
              <Input value={form.preRegisteredId} onChange={(e) => setForm((f) => ({ ...f, preRegisteredId: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email (used on pre-registration)</Label>
                <Input value={form.owner_email} onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone (used on pre-registration)</Label>
                <Input value={form.owner_phone} onChange={(e) => setForm((f) => ({ ...f, owner_phone: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date lost (optional)</Label>
                <Input value={form.date_lost} onChange={(e) => setForm((f) => ({ ...f, date_lost: e.target.value }))} placeholder="YYYY-MM-DD" />
              </div>
              <div className="space-y-2">
                <Label>State (optional override)</Label>
                <Input value={form.location_state} onChange={(e) => setForm((f) => ({ ...f, location_state: e.target.value }))} placeholder="AL" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City (optional override)</Label>
                <Input value={form.location_city} onChange={(e) => setForm((f) => ({ ...f, location_city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ZIP (optional)</Label>
                <Input value={form.location_zip} onChange={(e) => setForm((f) => ({ ...f, location_zip: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Where last seen / details (optional)</Label>
              <Input value={form.location_detail} onChange={(e) => setForm((f) => ({ ...f, location_detail: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Collar/microchip/reward/temperament..." />
            </div>

            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? 'Activating…' : 'Activate Missing'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

