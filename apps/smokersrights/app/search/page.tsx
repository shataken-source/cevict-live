'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

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
  { value: 'all', label: 'All Categories' },
  { value: 'indoor_smoking', label: 'Indoor Smoking' },
  { value: 'vaping', label: 'Vaping' },
  { value: 'outdoor_public', label: 'Outdoor Public Spaces' },
  { value: 'patio_private', label: 'Patio/Private Areas' },
  { value: 'retail_sales', label: 'Retail Sales' },
  { value: 'hemp_restrictions', label: 'Hemp Restrictions' },
  { value: 'penalties', label: 'Penalties & Enforcement' },
];

export default function SearchPage() {
  const [laws, setLaws] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadLaws();
  }, [selectedState, selectedCategory]);

  const loadLaws = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedState !== 'all') params.append('state', selectedState);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('q', searchQuery);

      const response = await fetch(`/api/laws?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setLaws(data.laws || []);
      } else {
        setLaws([]);
      }
    } catch (error) {
      console.error('Error loading laws:', error);
      setLaws([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLaws();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Law Explorer
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Search and filter smoking & vaping laws by state and category
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search laws by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg font-semibold text-white rounded-lg disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All States</option>
                {SOUTHEAST_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading laws...</p>
          </div>
        ) : laws.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No laws found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filters.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {laws.map((law) => (
              <Link
                key={law.id}
                href={`/legal/${law.state_code.toLowerCase()}/${law.category}`}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{law.state_name}</h3>
                    <p className="text-sm text-gray-600">{CATEGORIES.find(c => c.value === law.category)?.label || law.category}</p>
                  </div>
                </div>
                {law.summary && (
                  <p className="text-sm text-gray-700 mb-4 line-clamp-3">{law.summary}</p>
                )}
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  Updated {law.last_updated_at ? new Date(law.last_updated_at).toLocaleDateString() : 'Recently'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
