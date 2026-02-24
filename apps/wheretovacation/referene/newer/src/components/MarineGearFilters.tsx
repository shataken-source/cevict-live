import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, SlidersHorizontal } from 'lucide-react';

interface FilterState {
  search: string;
  category: string;
  retailer: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sortBy: string;
}

interface Props {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function MarineGearFilters({ filters, onFilterChange }: Props) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-5 h-5" />
        <h2 className="text-xl font-bold">Filters</h2>
      </div>

      <div>
        <Label>Search Products</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search marine gear..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label>Category</Label>
        <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="safety">Safety Gear</SelectItem>
            <SelectItem value="fishing">Fishing Equipment</SelectItem>
            <SelectItem value="accessories">Boat Accessories</SelectItem>
            <SelectItem value="navigation">Navigation</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>

        </Select>
      </div>

      <div>
        <Label>Retailer</Label>
        <Select value={filters.retailer} onValueChange={(v) => updateFilter('retailer', v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Retailers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Retailers</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
            <SelectItem value="walmart">Walmart</SelectItem>
            <SelectItem value="temu">Temu</SelectItem>
            <SelectItem value="boatus">BoatUS</SelectItem>
          </SelectContent>

        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Min Price</Label>
          <Input
            type="number"
            placeholder="$0"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
          />
        </div>
        <div>
          <Label>Max Price</Label>
          <Input
            type="number"
            placeholder="$1000"
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={filters.inStock}
          onCheckedChange={(checked) => updateFilter('inStock', checked)}
        />
        <Label>In Stock Only</Label>
      </div>

      <div>
        <Label>Sort By</Label>
        <Select value={filters.sortBy} onValueChange={(v) => updateFilter('sortBy', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="reviews">Most Reviews</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => onFilterChange({
          search: '',
          category: 'all',
          retailer: 'all',
          minPrice: '',
          maxPrice: '',
          inStock: false,
          sortBy: 'featured'
        })}
      >
        Reset Filters
      </Button>
    </div>
  );
}
