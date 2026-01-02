'use client';

/**
 * Enhanced Search Component
 * Advanced search with filters, autocomplete, and quick results
 */

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Filter, X, Clock, TrendingUp } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'law' | 'state' | 'category' | 'place';
  title: string;
  subtitle: string;
  icon: string;
  url: string;
}

interface EnhancedSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function EnhancedSearch({ onSearch, placeholder = 'Search laws, states, categories...' }: EnhancedSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load recent searches
    const stored = localStorage.getItem('sr-recent-searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Search as user types
    if (query.length >= 2) {
      setLoading(true);
      const timer = setTimeout(() => {
        performSearch(query);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    // Simulate search results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'state',
        title: 'Georgia',
        subtitle: '12 laws, 3 categories',
        icon: '🍑',
        url: '/search?state=GA'
      },
      {
        id: '2',
        type: 'law',
        title: 'Indoor Smoking Ban',
        subtitle: 'Georgia - Public workplaces',
        icon: '⚖️',
        url: '/search?state=GA&category=indoor_smoking'
      },
      {
        id: '3',
        type: 'category',
        title: 'Vaping Regulations',
        subtitle: 'All states',
        icon: '💨',
        url: '/search?category=vaping'
      },
      {
        id: '4',
        type: 'place',
        title: 'Smoking-Friendly Bars',
        subtitle: 'Near Atlanta, GA',
        icon: '📍',
        url: '/places?type=bar'
      },
    ].filter(r => 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(mockResults);
    setLoading(false);
  };

  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('sr-recent-searches', JSON.stringify(newRecent));
    
    setQuery('');
    setIsOpen(false);
    window.location.href = result.url;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('sr-recent-searches', JSON.stringify(newRecent));
      onSearch(query);
      setIsOpen(false);
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('sr-recent-searches');
  };

  const trendingSearches = ['Georgia vaping', 'Florida smoking', 'Indoor ban', 'Hemp regulations'];

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-lg"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
          {/* Loading state */}
          {loading && (
            <div className="p-4 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-400 px-3 py-2">RESULTS</div>
              {results.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl transition-all text-left"
                >
                  <span className="text-2xl">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{result.title}</div>
                    <div className="text-sm text-slate-500 truncate">{result.subtitle}</div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full capitalize">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-6 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          )}

          {/* Recent & Trending (when no query) */}
          {!loading && query.length < 2 && (
            <div className="p-2">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <Clock className="w-3 h-3" />
                      RECENT SEARCHES
                    </div>
                    <button
                      onClick={clearRecent}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Clear all
                    </button>
                  </div>
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(search);
                        onSearch(search);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-all text-left"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Trending */}
              <div>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400">
                  <TrendingUp className="w-3 h-3" />
                  TRENDING
                </div>
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {trendingSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(search);
                        onSearch(search);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm transition-all"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Filters */}
              <div className="border-t border-slate-100 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                  <Filter className="w-3 h-3" />
                  QUICK FILTERS
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href="/search?category=indoor_smoking" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700">
                    🚭 Indoor Smoking
                  </a>
                  <a href="/search?category=vaping" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700">
                    💨 Vaping
                  </a>
                  <a href="/places" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700">
                    <MapPin className="w-4 h-4" /> Nearby Places
                  </a>
                  <a href="/compare" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700">
                    ⚖️ Compare States
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

