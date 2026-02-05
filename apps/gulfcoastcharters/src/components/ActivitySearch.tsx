import { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface ActivitySearchProps {
  onSearch: (activities: string[], searchTerm: string) => void;
}

export default function ActivitySearch({ onSearch }: ActivitySearchProps) {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('activities');
    if (stored) {
      setActivities(JSON.parse(stored));
    }
  }, []);

  const toggleActivity = (activity: string) => {
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleSearch = () => {
    onSearch(selectedActivities, searchInput);
    // Scroll directly to destinations section
    setTimeout(() => {
      const element = document.getElementById('destinations');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };


  const handleClear = () => {
    setSelectedActivities([]);
    setSearchInput('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 rounded-2xl shadow-2xl p-1 mb-12">
      <div className="bg-white rounded-xl p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
            <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Find Your Perfect Destination
            </h2>
            <Sparkles className="w-8 h-8 text-pink-600 animate-pulse" />
          </div>
          <p className="text-gray-600 text-lg">Discover amazing places tailored to your passions</p>
        </div>
        
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-purple-600" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by location, activity, or vibe..."
              className="w-full pl-14 pr-4 py-4 text-lg border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {activities.length > 0 && (
          <>
            <p className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
              Select Your Favorite Activities
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {activities.map(activity => (
                <button
                  key={activity}
                  onClick={() => toggleActivity(activity)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all transform hover:scale-105 ${
                    selectedActivities.includes(activity)
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-300'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-purple-100 hover:to-pink-100 hover:text-purple-700'
                  }`}
                >
                  {activity}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleClear}
            className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            <X className="w-5 h-5" />
            Clear
          </button>
          <button
            onClick={handleSearch}
            className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <Search className="w-5 h-5" />
            Search
          </button>
        </div>

        {selectedActivities.length > 0 && (
          <div className="mt-6 text-center">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm font-semibold">
              {selectedActivities.length} {selectedActivities.length === 1 ? 'activity' : 'activities'} selected
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
