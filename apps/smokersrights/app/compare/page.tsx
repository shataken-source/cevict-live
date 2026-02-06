'use client';

import { useState, useEffect } from 'react';
import { Scale, ArrowRight, Download, Share2 } from 'lucide-react';

const SOUTHEAST_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'VA', name: 'Virginia' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'WV', name: 'West Virginia' },
];

const CATEGORIES = [
  'indoor_smoking',
  'vaping',
  'outdoor_public',
  'patio_private',
  'retail_sales',
  'hemp_restrictions',
  'penalties',
];

export default function ComparePage() {
  const [state1, setState1] = useState('AL');
  const [state2, setState2] = useState('FL');
  const [laws1, setLaws1] = useState<any[]>([]);
  const [laws2, setLaws2] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state1 && state2) {
      loadComparison();
    }
  }, [state1, state2]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/laws?state=${state1}`),
        fetch(`/api/laws?state=${state2}`),
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();

      if (res1.ok && data1.success) setLaws1(data1.laws || []);
      if (res2.ok && data2.success) setLaws2(data2.laws || []);
    } catch (error) {
      console.error('Error loading comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLawForCategory = (laws: any[], category: string) => {
    return laws.find(l => l.category === category);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Scale className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Compare States
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Side-by-side comparison of laws across different states
          </p>
        </div>

        {/* State Selectors */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State 1</label>
              <select
                value={state1}
                onChange={(e) => setState1(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-500 text-lg"
              >
                {SOUTHEAST_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State 2</label>
              <select
                value={state2}
                onChange={(e) => setState2(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-500 text-lg"
              >
                {SOUTHEAST_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading comparison...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {SOUTHEAST_STATES.find(s => s.code === state1)?.name}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {SOUTHEAST_STATES.find(s => s.code === state2)?.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {CATEGORIES.map((category) => {
                    const law1 = getLawForCategory(laws1, category);
                    const law2 = getLawForCategory(laws2, category);
                    return (
                      <tr key={category} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900 capitalize">
                          {category.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {law1 ? (
                            <div>
                              <p className="line-clamp-2">{law1.summary || 'No data'}</p>
                              {law1.last_updated_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Updated {new Date(law1.last_updated_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No data</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {law2 ? (
                            <div>
                              <p className="line-clamp-2">{law2.summary || 'No data'}</p>
                              {law2.last_updated_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Updated {new Date(law2.last_updated_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No data</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
