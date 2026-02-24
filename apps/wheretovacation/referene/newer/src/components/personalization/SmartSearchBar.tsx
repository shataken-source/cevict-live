import { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function SmartSearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length > 2) {
      generateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const generateSuggestions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: searches } = await supabase
      .from('user_searches')
      .select('query')
      .eq('user_id', user?.id)
      .limit(5);

    const common = [
      `${query} near me`,
      `${query} deals`,
      `${query} with captain`,
      `best ${query}`,
      `${query} reviews`
    ];

    setSuggestions(common);
    setShowSuggestions(true);
  };

  const handleSearch = async (searchQuery: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('user_searches').insert({
        user_id: user.id,
        query: searchQuery,
        created_at: new Date().toISOString()
      });

      const { data } = await supabase.functions.invoke('ai-personalization-engine', {
        body: { 
          action: 'smart_search', 
          userId: user.id, 
          data: { query: searchQuery, userContext: {} }
        }
      });

      if (data?.data) {
        navigate(`/search?q=${encodeURIComponent(data.data.enhancedQuery)}`);
      }
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
    
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Try 'deep sea fishing Miami' or 'sunset cruise'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
          onFocus={() => query.length > 2 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="pl-10 pr-10 h-12 text-lg"
        />
        <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border z-50">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              onClick={() => handleSearch(suggestion)}
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <span>{suggestion}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}