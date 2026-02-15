'use client';

/**
 * Enhanced Search Component
 */

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'law' | 'state' | 'category' | 'place';
  title: string;
  subtitle: string;
  icon: string;
  url: string;
}

interface EnhancedSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export default function EnhancedSearch({ onSearch, placeholder = 'Search laws, states, categories...' }: EnhancedSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sr-recent-searches');
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      setLoading(true);
      const timer = setTimeout(() => performSearch(query), 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    const mockResults: SearchResult[] = [
      { id: '1', type: 'state' as const, title: 'Georgia', subtitle: '12 laws, 3 categories', icon: '🍑', url: '/search?state=GA' },
      { id: '2', type: 'law' as const, title: 'Indoor Smoking Ban', subtitle: 'Georgia - Retail', icon: '🚭', url: '/search?state=GA&category=indoor' },
      { id: '3', type: 'place' as const, title: 'The Smoking Room', subtitle: 'Atlanta, GA - Lounge', icon: '🛋️', url: '/places/1' },
    ].filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));

    setResults(mockResults);
    setLoading(false);
  };

  const handleSelect = (result: SearchResult) => {
    if (onSearch) onSearch(result.title);
    setQuery(result.title);
    setIsOpen(false);

    const updated = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('sr-recent-searches', JSON.stringify(updated));
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2 || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
          {loading ? (
            <div className="p-4 text-center text-slate-500">Searching...</div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                >
                  <span className="text-2xl">{result.icon}</span>
                  <div>
                    <div className="font-medium text-slate-900">{result.title}</div>
                    <div className="text-sm text-slate-500">{result.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : recentSearches.length > 0 && query.length < 2 ? (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Recent Searches
              </div>
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(search); performSearch(search); }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  {search}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
