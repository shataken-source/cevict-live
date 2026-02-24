'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ShelterRegisterPage() {
  const router = useRouter();
  const [shelterName, setShelterName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [shelterUrl, setShelterUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/petreunion/shelter/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shelter_name: shelterName.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim().toUpperCase() || undefined,
          zipcode: zipcode.trim() || undefined,
          shelter_url: shelterUrl.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((data as any)?.error || 'Registration failed');
      }

      setSuccess(true);
      router.push('/petreunion/shelter/login');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card className="border-2 border-orange-200 shadow-sm bg-white/80">
        <CardHeader>
          <CardTitle className="text-2xl">Create Shelter Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Register your shelter to access shelter tools. Passwords must be at least 8 characters.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Account created.
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-900">Shelter name</label>
              <input
                value={shelterName}
                onChange={(e) => setShelterName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-900">Phone (optional)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900">Zip code (optional)</label>
                <input
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  autoComplete="postal-code"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900">City (optional)</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900">State (optional)</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  autoComplete="address-level1"
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900">Website (optional)</label>
              <input
                value={shelterUrl}
                onChange={(e) => setShelterUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                placeholder="https://"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Creating...' : 'Create account'}
              </Button>
              <Link
                href="/petreunion/shelter/login"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Back to login
              </Link>
            </div>
          </form>

          <div className="pt-2">
            <Link href="/petreunion" className="text-sm text-blue-600 hover:underline">
              Back to PetReunion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
