'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useState } from 'react';

export default function PreRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const priceYear = 19.95;

  const [form, setForm] = useState({
    pet_name: '',
    pet_type: 'dog' as 'dog' | 'cat',
    breed: '',
    color: '',
    size: 'medium',
    age: '',
    gender: 'unknown',
    description: '',
    photo_url: '',
    location_city: '',
    location_state: '',
    location_zip: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    website: '', // honeypot
  });

  async function submit() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/petreunion/pre-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to pre-register');
      }
      setSuccess(data.preRegistered || true);
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
            <h1 className="text-3xl font-bold text-gray-900">Pre-register your pet</h1>
            <p className="text-gray-600">
              Pre-registering is <span className="font-semibold">free</span>. Optional proactive monitoring is{' '}
              <span className="font-semibold">${priceYear}/year</span>.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <Link className="underline" href="/pre-register/pro">
                Why pre-register? See how proactive searching works →
              </Link>
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
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
              Pre-registration saved. <span className="font-semibold">Monitoring is OFF</span> until you activate it.
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/pre-register/pro">
                  <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600">
                    Activate monitoring (${priceYear}/year)
                  </Button>
                </Link>
                <Link href="/pre-register/activate">
                  <Button size="sm" variant="outline">
                    Pet is missing? Activate a public lost listing
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Pet profile</CardTitle>
            <CardDescription>We use this to match against found pet reports and scraped listings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Honeypot (hidden) */}
            <input
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pet name</Label>
                <Input value={form.pet_name} onChange={(e) => setForm((f) => ({ ...f, pet_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.pet_type}
                  onChange={(e) => setForm((f) => ({ ...f, pet_type: e.target.value as any }))}
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Breed</Label>
                <Input required value={form.breed} onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input required value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.size}
                  onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="giant">Giant</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Age (optional)</Label>
                <Input value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} placeholder="e.g. 2 years" />
              </div>
              <div className="space-y-2">
                <Label>Photo URL (optional)</Label>
                <Input
                  value={form.photo_url}
                  onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Distinctive markings, collar, microchip, temperament..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.location_city} onChange={(e) => setForm((f) => ({ ...f, location_city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>State (required)</Label>
                <Input
                  required
                  value={form.location_state}
                  onChange={(e) => setForm((f) => ({ ...f, location_state: e.target.value }))}
                  placeholder="AL"
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input value={form.location_zip} onChange={(e) => setForm((f) => ({ ...f, location_zip: e.target.value }))} />
              </div>
            </div>

            <div className="border-t pt-5">
              <h3 className="font-semibold mb-3">Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.owner_name} onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.owner_email} onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.owner_phone} onChange={(e) => setForm((f) => ({ ...f, owner_phone: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">We require an email or phone so we can notify you when matches are found.</p>
            </div>

            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? 'Saving…' : 'Save pre-registration (free)'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

