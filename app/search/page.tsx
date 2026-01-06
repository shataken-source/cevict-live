'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ALL_STATES } from '@/lib/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  ExternalLink,
  Clock,
  Star,
  Bookmark,
  Download,
  X
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_LABELS = {
  indoor_smoking: 'Indoor Smoking',
  vaping: 'Vaping',
  outdoor_public: 'Outdoor Public Spaces',
  patio_private: 'Patio/Private Areas',
  retail_sales: 'Retail Sales',
  hemp_restrictions: 'Hemp Restrictions',
  penalties: 'Penalties & Enforcement',
};

const PLACE_CATEGORIES = {
  lounge: 'Smoking Lounge',
  patio: 'Restaurant/Bar Patio',
  hotel: 'Hotel (Smoking Rooms)',
  bar: 'Bar/Nightclub',
  restaurant: 'Restaurant',
  shop: 'Vape/Tobacco Shop',
  other: 'Other',
};

const CATEGORY_COLORS = {
  indoor_smoking: 'bg-red-100 text-red-800',
  vaping: 'bg-purple-100 text-purple-800',
  outdoor_public: 'bg-green-100 text-green-800',
  patio_private: 'bg-blue-100 text-blue-800',
  retail_sales: 'bg-orange-100 text-orange-800',
  hemp_restrictions: 'bg-yellow-100 text-yellow-800',
  penalties: 'bg-gray-100 text-gray-800',
};

interface LawCard {
  id: string;
  state_code: string;
  state_name: string;
  category: keyof typeof CATEGORY_LABELS;
  summary: string;
  details?: string;
  tags: string[];
  source_urls: string[];
  last_verified_at: string;
  last_updated_at: string;
}

interface DirectoryPlace {
  id: string;
  name: string;
  address: string;
  city: string;
  state_code: string;
  category: string;
  description?: string;
  notes?: string;
  website_url?: string;
  phone?: string;
  age_restriction: 'none' | '18+' | '21+';
  amenities: string[];
  submitted_at: string;
}

interface SearchFilters {
  query: string;
  contentType: 'all' | 'laws' | 'places';
  state: string;
  lawCategories: string[];
  placeCategories: string[];
  dateRange: 'all' | 'week' | 'month' | 'year';
  hasSource: boolean;
  verifiedOnly: boolean;
}

interface SearchResult {
  type: 'law' | 'place';
  data: LawCard | DirectoryPlace;
  relevanceScore: number;
  highlights: string[];
}

function AdvancedSearchContent() {
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  const [savedSearches, setSavedSearches] = useState<SearchFilters[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    contentType: 'all',
    state: '',
    lawCategories: [],
    placeCategories: [],
    dateRange: 'all',
    hasSource: false,
    verifiedOnly: true
  });

  const supabase = createClient() as NonNullable<ReturnType<typeof createClient>> | null;

  useEffect(() => {
    loadSavedSearches();

    // Read URL parameters and set filters
    const category = searchParams.get('category');
    const state = searchParams.get('state');

    if (category || state) {
      const newFilters = {
        query: '',
        contentType: 'laws' as const,
        state: state || '',
        lawCategories: category ? [category] : [],
        placeCategories: [],
        dateRange: 'all' as const,
        hasSource: false,
        verifiedOnly: true
      };

      setFilters(newFilters);

      // Perform search immediately with new filters
      setTimeout(() => {
        performSearchWithFilters(newFilters);
      }, 100);
    } else {
      // If no category/state in URL, check if we should show empty state or default results
      // For now, we'll leave it as is - user can search manually
    }
  }, [searchParams]);

  const performSearchWithFilters = async (searchFilters: SearchFilters) => {
    // Allow search without query if we have category or state filters
    if (!searchFilters.query.trim() && !searchFilters.lawCategories.length && !searchFilters.state && !searchFilters.placeCategories.length) {
      return;
    }

    try {
      setLoading(true);
      const results: SearchResult[] = [];

      // Search laws
      if (searchFilters.contentType === 'all' || searchFilters.contentType === 'laws') {
        const lawResults = await searchLawsWithFilters(searchFilters);
        results.push(...lawResults);
      }

      // Search places
      if (searchFilters.contentType === 'all' || searchFilters.contentType === 'places') {
        const placeResults = await searchPlacesWithFilters(searchFilters);
        results.push(...placeResults);
      }

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      setSearchResults(results);

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    await performSearchWithFilters(filters);
  };

  const searchLawsWithFilters = async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    if (!supabase) {
      console.warn('Supabase not configured; returning empty results');
      return [];
    }
    let query = supabase
      .from('sr_law_cards')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Apply filters
    if (searchFilters.state) {
      query = query.eq('state_code', searchFilters.state);
    }

    if (searchFilters.lawCategories.length > 0) {
      query = query.in('category', searchFilters.lawCategories);
    }

    if (searchFilters.hasSource) {
      query = query.not('source_urls', 'eq', '{}');
    }

    // Text search
    if (searchFilters.query) {
      const searchTerms = searchFilters.query.toLowerCase().split(' ').filter(Boolean);
      const searchConditions = searchTerms.map(term =>
        `summary.ilike.%${term}%,details.ilike.%${term}%,tags.cs.{${term}}`
      );
      query = query.or(searchConditions.join(','));
    }

    // Date filter
    if (searchFilters.dateRange !== 'all') {
      const dateMap = {
        week: 7,
        month: 30,
        year: 365
      };
      const daysAgo = dateMap[searchFilters.dateRange as keyof typeof dateMap];
      const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      query = query.gte('last_updated_at', cutoffDate.toISOString());
    }

    if (searchFilters.verifiedOnly) {
      query = query.eq('is_verified', true);
    }

    const { data, error } = await query.order('last_updated_at', { ascending: false });

    if (error || !data) return [];

    return (data as LawCard[]).map(law => ({
      type: 'law' as const,
      data: law,
      relevanceScore: calculateRelevanceScore(law, searchFilters.query),
      highlights: getHighlights(law, searchFilters.query)
    }));
  };

  const searchLaws = async (): Promise<SearchResult[]> => {
    return searchLawsWithFilters(filters);
  };

  const searchPlacesWithFilters = async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    if (!supabase) {
      console.warn('Supabase not configured; returning empty places');
      return [];
    }
    let query = supabase
      .from('sr_directory_places')
      .select('*', { count: 'exact' });

    // Apply filters
    if (searchFilters.state) {
      query = query.eq('state_code', searchFilters.state);
    }

    if (searchFilters.placeCategories.length > 0) {
      query = query.in('category', searchFilters.placeCategories);
    }

    if (searchFilters.verifiedOnly) {
      query = query.eq('status', 'verified');
    }

    // Text search
    if (searchFilters.query) {
      const searchTerms = searchFilters.query.toLowerCase().split(' ').filter(Boolean);
      const searchConditions = searchTerms.map(term =>
        `name.ilike.%${term}%,address.ilike.%${term}%,city.ilike.%${term}%,description.ilike.%${term}%,notes.ilike.%${term}%`
      );
      query = query.or(searchConditions.join(','));
    }

    // Date filter
    if (searchFilters.dateRange !== 'all') {
      const dateMap = {
        week: 7,
        month: 30,
        year: 365
      };
      const daysAgo = dateMap[searchFilters.dateRange as keyof typeof dateMap];
      const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      query = query.gte('submitted_at', cutoffDate.toISOString());
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });

    if (error || !data) return [];

    return (data as DirectoryPlace[]).map(place => ({
      type: 'place' as const,
      data: place,
      relevanceScore: calculateRelevanceScore(place, searchFilters.query),
      highlights: getHighlights(place, searchFilters.query)
    }));
  };

  const searchPlaces = async (): Promise<SearchResult[]> => {
    return searchPlacesWithFilters(filters);
  };

  const calculateRelevanceScore = (item: any, query: string): number => {
    if (!query) return 0;

    let score = 0;
    const terms = query.toLowerCase().split(' ').filter(Boolean);

    terms.forEach(term => {
      // Exact match gets highest score
      if (item.summary?.toLowerCase().includes(term) ||
          item.name?.toLowerCase().includes(term)) {
        score += 10;
      }
      // Partial match gets medium score
      if (item.details?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)) {
        score += 5;
      }
      // Tag match gets lower score
      if (item.tags?.includes(term)) {
        score += 3;
      }
    });

    // Boost for recent items
    const itemDate = new Date(item.last_updated_at || item.submitted_at);
    const daysSinceUpdate = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 2;
    if (daysSinceUpdate < 7) score += 3;

    return score;
  };

  const getHighlights = (item: any, query: string): string[] => {
    if (!query) return [];

    const highlights: string[] = [];
    const terms = query.toLowerCase().split(' ').filter(Boolean);

    terms.forEach(term => {
      if (item.summary?.toLowerCase().includes(term)) {
        highlights.push('Summary match');
      }
      if (item.name?.toLowerCase().includes(term)) {
        highlights.push('Name match');
      }
      if (item.tags?.includes(term)) {
        highlights.push('Tag match');
      }
    });

    return Array.from(new Set(highlights)); // Remove duplicates
  };

  const saveSearch = () => {
    const newSavedSearch = { ...filters };
    setSavedSearches(prev => [...prev, newSavedSearch]);
    localStorage.setItem('smokersrights-saved-searches', JSON.stringify([...savedSearches, newSavedSearch]));
  };

  const loadSavedSearches = () => {
    try {
      const saved = localStorage.getItem('smokersrights-saved-searches');
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  const loadSavedSearch = (saved: SearchFilters) => {
    setFilters(saved);
    performSearch();
  };

  const exportResults = () => {
    const exportData = searchResults.map(result => ({
      type: result.type,
      ...result.data,
      relevanceScore: result.relevanceScore,
      highlights: result.highlights.join(', ')
    }));

    const csv = [
      'Type,Name,State,Category,Summary,Relevance,Highlights',
      ...exportData.map(item => {
        const data = item as any;
        return `"${item.type}","${data.name || data.summary}","${data.state_code}","${data.category}","${(data.summary || data.description || '').replace(/"/g, '""')}","${item.relevanceScore}","${item.highlights.replace(/"/g, '""')}"`;
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smokersrights-search-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleLawCategory = (category: string, checked: boolean) => {
    updateFilter('lawCategories',
      checked
        ? [...filters.lawCategories, category]
        : filters.lawCategories.filter(c => c !== category)
    );
  };

  const togglePlaceCategory = (category: string, checked: boolean) => {
    updateFilter('placeCategories',
      checked
        ? [...filters.placeCategories, category]
        : filters.placeCategories.filter(c => c !== category)
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-6 h-6" />
                Advanced Search
              </h1>
              <p className="text-slate-600">Search laws and places with powerful filters</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={saveSearch}>
                <Bookmark className="w-4 h-4 mr-2" />
                Save Search
              </Button>
              {searchResults.length > 0 && (
                <Button variant="outline" onClick={exportResults}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Search laws, places, addresses, tags..."
                    value={filters.query}
                    onChange={(e) => updateFilter('query', e.target.value)}
                    className="pl-10 text-lg"
                    onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                  />
                </div>
              </div>
              <Button onClick={performSearch} disabled={loading || !filters.query.trim()}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-4 mt-4 flex-wrap">
              <Select value={filters.contentType} onValueChange={(value: any) => updateFilter('contentType', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="laws">Laws Only</SelectItem>
                  <SelectItem value="places">Places Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.state} onValueChange={(value) => updateFilter('state', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All States</SelectItem>
                  {ALL_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.dateRange} onValueChange={(value: any) => updateFilter('dateRange', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="year">Past Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Advanced Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Law Categories */}
              {(filters.contentType === 'all' || filters.contentType === 'laws') && (
                <div>
                  <h3 className="font-medium mb-3">Law Categories</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`law-${key}`}
                          checked={filters.lawCategories.includes(key)}
                          onCheckedChange={(checked) => toggleLawCategory(key, checked as boolean)}
                        />
                        <label htmlFor={`law-${key}`} className="text-sm">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Place Categories */}
              {(filters.contentType === 'all' || filters.contentType === 'places') && (
                <div>
                  <h3 className="font-medium mb-3">Place Categories</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(PLACE_CATEGORIES).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`place-${key}`}
                          checked={filters.placeCategories.includes(key)}
                          onCheckedChange={(checked) => togglePlaceCategory(key, checked as boolean)}
                        />
                        <label htmlFor={`place-${key}`} className="text-sm">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-source"
                    checked={filters.hasSource}
                    onCheckedChange={(checked) => updateFilter('hasSource', checked as boolean)}
                  />
                  <label htmlFor="has-source" className="text-sm">Has source URLs</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified-only"
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) => updateFilter('verifiedOnly', checked as boolean)}
                  />
                  <label htmlFor="verified-only" className="text-sm">Verified places only</label>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    query: filters.query,
                    contentType: 'all',
                    state: '',
                    lawCategories: [],
                    placeCategories: [],
                    dateRange: 'all',
                    hasSource: false,
                    verifiedOnly: true
                  })}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Saved Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedSearches.map((saved, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium">{saved.query}</div>
                      <div className="text-sm text-slate-600">
                        {saved.contentType} • {saved.state || 'All states'} • {saved.dateRange}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => loadSavedSearch(saved)}>
                      Load
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">
              Results ({searchResults.length})
            </TabsTrigger>
            <TabsTrigger value="laws">
              Laws ({searchResults.filter(r => r.type === 'law').length})
            </TabsTrigger>
            <TabsTrigger value="places">
              Places ({searchResults.filter(r => r.type === 'place').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-slate-600">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <SearchResultCard key={`${result.type}-${(result.data as any).id}`} result={result} />
                ))}
              </div>
            ) : filters.query ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No results found</h3>
                <p className="text-slate-600 mb-4">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Start your search</h3>
                <p className="text-slate-600">Enter search terms above to find laws and places</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="laws" className="space-y-4">
            {searchResults.filter(r => r.type === 'law').map((result, index) => (
              <SearchResultCard key={`${result.type}-${(result.data as any).id}`} result={result} />
            ))}
          </TabsContent>

          <TabsContent value="places" className="space-y-4">
            {searchResults.filter(r => r.type === 'place').map((result, index) => (
              <SearchResultCard key={`${result.type}-${(result.data as any).id}`} result={result} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdvancedSearch() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading search...</div>}>
      <AdvancedSearchContent />
    </Suspense>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const law = result.type === 'law' ? result.data as LawCard : null;
  const place = result.type === 'place' ? result.data as DirectoryPlace : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant={result.type === 'law' ? 'default' : 'secondary'}>
              {result.type === 'law' ? 'Law' : 'Place'}
            </Badge>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{result.relevanceScore}</span>
            </div>
          </div>
          <div className="flex gap-1">
            {result.highlights.map((highlight, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {highlight}
              </Badge>
            ))}
          </div>
        </div>

        {law && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">{CATEGORY_LABELS[law.category]}</h3>
            <p className="text-slate-700 mb-3">{law.summary}</p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <MapPin className="w-3 h-3 inline mr-1" />
                {law.state_name}
              </div>
              <div className="text-sm text-slate-600">
                <Clock className="w-3 h-3 inline mr-1" />
                Updated: {new Date(law.last_updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {place && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">{place.name}</h3>
            <p className="text-slate-700 mb-2">{place.description}</p>
            <div className="text-sm text-slate-600 mb-3">
              <MapPin className="w-3 h-3 inline mr-1" />
              {place.address}, {place.city}, {place.state_code}
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {PLACE_CATEGORIES[place.category as keyof typeof PLACE_CATEGORIES]}
              </Badge>
              <div className="text-sm text-slate-600">
                <Clock className="w-3 h-3 inline mr-1" />
                Added: {new Date(place.submitted_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
