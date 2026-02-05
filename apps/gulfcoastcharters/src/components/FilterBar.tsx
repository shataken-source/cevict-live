import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [location, setLocation] = useState('');
  const [boatType, setBoatType] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  const handleSearch = () => {
    const filters = { location, boatType, priceRange, sortBy };
    onFilterChange(filters);
    window.location.hash = '#search-results';
  };

  return (
    <div className="bg-white shadow-md py-4 sticky top-0 z-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-foreground"
          >
            <option value="">All Locations</option>
            <option value="Texas">Texas</option>
            <option value="Louisiana">Louisiana</option>
            <option value="Mississippi">Mississippi</option>
            <option value="Alabama">Alabama</option>
            <option value="Florida">Florida</option>
          </select>

          <select
            value={boatType}
            onChange={(e) => setBoatType(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-foreground"
          >
            <option value="">All Boat Types</option>
            <option value="Sport Fishing">Sport Fishing</option>
            <option value="Deep Sea">Deep Sea</option>
            <option value="Bay Fishing">Bay Fishing</option>
            <option value="Party Boat">Party Boat</option>
          </select>

          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-foreground"
          >
            <option value="">Any Price</option>
            <option value="0-500">Under $500</option>
            <option value="500-1000">$500 - $1000</option>
            <option value="1000-1500">$1000 - $1500</option>
            <option value="1500+">$1500+</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-foreground"
          >
            <option value="rating">Highest Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="reviews">Most Reviews</option>
          </select>

          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

