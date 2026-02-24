import { Search } from 'lucide-react';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRegion: string;
  onRegionChange: (value: string) => void;
  selectedSeason: string;
  onSeasonChange: (value: string) => void;
  priceRange: number;
  onPriceChange: (value: number) => void;
}

export function FilterBar({
  searchTerm, onSearchChange, selectedRegion, onRegionChange,
  selectedSeason, onSeasonChange, priceRange, onPriceChange
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedRegion}
          onChange={(e) => onRegionChange(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Regions</option>
          <option value="beach">Beach</option>
          <option value="mountain">Mountain</option>
          <option value="city">City</option>
          <option value="countryside">Countryside</option>
        </select>
        <select
          value={selectedSeason}
          onChange={(e) => onSeasonChange(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Seasons</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="fall">Fall</option>
          <option value="winter">Winter</option>
        </select>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Max Budget: ${priceRange}</label>
          <input
            type="range"
            min="1000"
            max="5000"
            step="100"
            value={priceRange}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
