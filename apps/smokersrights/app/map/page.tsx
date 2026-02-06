'use client';

import { useState, useEffect } from 'react';
import { MapPin, Info } from 'lucide-react';
import Link from 'next/link';

const STATES = [
  { code: 'AL', name: 'Alabama', region: 'Southeast' },
  { code: 'FL', name: 'Florida', region: 'Southeast' },
  { code: 'GA', name: 'Georgia', region: 'Southeast' },
  { code: 'LA', name: 'Louisiana', region: 'Southeast' },
  { code: 'MS', name: 'Mississippi', region: 'Southeast' },
  { code: 'NC', name: 'North Carolina', region: 'Southeast' },
  { code: 'SC', name: 'South Carolina', region: 'Southeast' },
  { code: 'TN', name: 'Tennessee', region: 'Southeast' },
  { code: 'VA', name: 'Virginia', region: 'Southeast' },
  { code: 'KY', name: 'Kentucky', region: 'Southeast' },
  { code: 'AR', name: 'Arkansas', region: 'Southeast' },
  { code: 'WV', name: 'West Virginia', region: 'Southeast' },
];

export default function MapPage() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateLaws, setStateLaws] = useState<any[]>([]);

  useEffect(() => {
    if (selectedState) {
      loadStateLaws(selectedState);
    }
  }, [selectedState]);

  const loadStateLaws = async (stateCode: string) => {
    try {
      const response = await fetch(`/api/laws?state=${stateCode}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setStateLaws(data.laws || []);
      }
    } catch (error) {
      console.error('Error loading state laws:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Interactive Map
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            State-by-state view of smoking and vaping laws
          </p>
        </div>

        {/* State Grid */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Browse All 50 States</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {STATES.map((state) => (
              <button
                key={state.code}
                onClick={() => setSelectedState(selectedState === state.code ? null : state.code)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  selectedState === state.code
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {state.code}
              </button>
            ))}
          </div>
        </div>

        {/* Selected State Info */}
        {selectedState && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {STATES.find(s => s.code === selectedState)?.name}
              </h2>
              <Link
                href={`/legal/${selectedState.toLowerCase()}`}
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
              >
                View Details <Info className="w-4 h-4" />
              </Link>
            </div>

            {stateLaws.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {stateLaws.map((law) => (
                  <div
                    key={law.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2 capitalize">
                      {law.category?.replace(/_/g, ' ') || 'Law'}
                    </h3>
                    {law.summary && (
                      <p className="text-sm text-gray-700 line-clamp-3 mb-2">{law.summary}</p>
                    )}
                    <Link
                      href={`/legal/${law.state_code.toLowerCase()}/${law.category}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Read more →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Loading laws for {STATES.find(s => s.code === selectedState)?.name}...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
