import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function Captains({ session }) {
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/boats?available=true&limit=60');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!cancelled) setBoats(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setBoats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout session={session}>
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-2">Find Your Captain</h1>
        <p className="text-gray-600 mb-8">Browse boats and captains pulled from the public listings feed.</p>
        {loading ? (
          <p>Loading...</p>
        ) : boats.length === 0 ? (
          <p>No captains yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {boats.map((b) => (
              <div key={b.id} className="bg-white p-6 rounded shadow border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{b.name}</h3>
                    <p className="text-sm text-gray-600">
                      {b.type}
                      {b.capacity ? ` • up to ${b.capacity}` : ''}
                    </p>
                    {b.captain ? <p className="text-sm text-gray-600">Captain: {b.captain}</p> : null}
                    {b.home_port ? <p className="text-sm text-gray-600">{b.home_port}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600 font-bold">
                      {b.price ? `$${b.price}` : 'Contact'}
                    </p>
                    {b.rating ? (
                      <p className="text-sm text-gray-600">
                        {Number(b.rating).toFixed(1)} ★ {b.reviews ? `(${b.reviews})` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
                {Array.isArray(b.specialties) && b.specialties.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {b.specialties.slice(0, 4).map((s) => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
