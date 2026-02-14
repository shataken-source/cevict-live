import { useAppContext } from '@/contexts/AppContext';
import { memo, useMemo, useState } from 'react';
import CharterCard from './CharterCard';
import SidebarAd from './SidebarAd';
import CharterCardSkeleton from './skeletons/CharterCardSkeleton';



interface CharterGridProps {
  filters?: {
    location?: string;
    boatType?: string;
    priceRange?: string;
    sortBy?: string;
    hideWeatherAffected?: boolean;
  };
}


const CharterGrid = memo(function CharterGrid({ filters: externalFilters }: CharterGridProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { charters } = useAppContext();
  const filters = externalFilters || {
    location: '',
    boatType: '',
    priceRange: '',
    sortBy: 'rating',
  };

  const filteredCharters = useMemo(() => {
    // Use only live data from Supabase/API - no mock data
    let result = [...charters];


    if (filters.location) {
      result = result.filter(c => c.location === filters.location);
    }

    if (filters.boatType) {
      result = result.filter(c => c.boatType === filters.boatType);
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(v => v.replace('+', ''));
      result = result.filter(c => {
        const price = c.priceFullDay || 0;
        if (max) {
          return price >= Number(min) && price <= Number(max);
        }
        return price >= Number(min);
      });
    }

    // Sort
    if (filters.sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (filters.sortBy === 'price-low') {
      result.sort((a, b) => (a.priceFullDay || 0) - (b.priceFullDay || 0));
    } else if (filters.sortBy === 'price-high') {
      result.sort((a, b) => (b.priceFullDay || 0) - (a.priceFullDay || 0));
    } else if (filters.sortBy === 'reviews') {
      result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }

    return result;
  }, [filters, charters]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              Available Charters ({filteredCharters.length})
            </h2>
          </div>
          <div data-testid="charter-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {isLoading ? (
              [...Array(6)].map((_, i) => <CharterCardSkeleton key={i} />)
            ) : (
              filteredCharters.map(charter => (
                <CharterCard key={charter.id} {...charter} />
              ))
            )}
          </div>

        </div>
        <div className="hidden lg:block w-80">
          <SidebarAd />
        </div>
      </div>
    </div>
  );
});

export default CharterGrid;

