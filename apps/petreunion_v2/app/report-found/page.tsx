'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportFoundPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    petName: '',
    petType: 'dog',
    breed: '',
    color: '',
    size: '',
    age: '',
    gender: '',
    description: '',
    location: '',
    date_found: '',
    finder_name: '',
    finder_email: '',
    finder_phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!form.petType || !form.color || !form.location || !form.date_found) {
      setError('petType, color, location, and date_found are required.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/report-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to submit report');
      }
      router.push('/search');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">Report Found Pet (v2)</h1>
        <p className="text-sm text-gray-600 mb-6">
          This writes a real row into <code>lost_pets</code> with status <code>found</code>. No fake records, ever.
        </p>
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pet Name</label>
            <input
              type="text"
              value={form.petName}
              onChange={e => handleChange('petName', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pet Type *</label>
              <select
                value={form.petType}
                onChange={e => handleChange('petType', e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color *</label>
              <input
                type="text"
                value={form.color}
                onChange={e => handleChange('color', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Where Found *</label>
            <input
              type="text"
              value={form.location}
              onChange={e => handleChange('location', e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Free text (e.g., near Main St, Columbus IN)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date Found *</label>
            <input
              type="date"
              value={form.date_found}
              onChange={e => handleChange('date_found', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-2 rounded bg-green-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Submit Report'}
          </button>
        </form>
      </div>
    </main>
  );
}

