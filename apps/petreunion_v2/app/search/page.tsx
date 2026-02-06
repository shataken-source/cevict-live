'use client';

import { useState } from 'react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Search failed');
      }
      setPets(data.pets || []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">Search Pets (v2)</h1>
        <p className="text-sm text-gray-600 mb-4">
          This only returns real rows from <code>lost_pets</code>. Fake scraper data is filtered out at the API.
        </p>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Search by name, breed, color, city, or description"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        {error && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {pets.map(pet => (
          <div key={pet.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold text-lg">
                  {pet.pet_name || '(no name)'} {pet.pet_type && `• ${pet.pet_type}`}
                </div>
                <div className="text-sm text-gray-600">
                  {pet.breed || ''}{pet.breed && pet.color ? ' • ' : ''}{pet.color || ''}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {pet.location_city || ''}{pet.location_state ? `, ${pet.location_state}` : ''}
                </div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                {pet.status}
                <br />
                {pet.created_at}
              </div>
            </div>
            {pet.description && (
              <p className="mt-2 text-sm text-gray-700">
                {pet.description}
              </p>
            )}
          </div>
        ))}
        {!loading && pets.length === 0 && (
          <p className="text-center text-gray-600 text-sm">
            No results yet. Try a search above.
          </p>
        )}
      </div>
    </main>
  );
}

