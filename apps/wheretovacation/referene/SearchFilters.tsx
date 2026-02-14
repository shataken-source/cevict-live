import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  propertyType: string;
  setPropertyType: (value: string) => void;
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
  bedrooms: string;
  setBedrooms: (value: string) => void;
  onSearch: () => void;
}

export function SearchFilters({
  searchTerm,
  setSearchTerm,
  propertyType,
  setPropertyType,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  bedrooms,
  setBedrooms,
  onSearch
}: SearchFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search by location, city, or property name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="flex-1"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger>
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="condo">Condo</SelectItem>
            <SelectItem value="cottage">Cottage</SelectItem>
            <SelectItem value="house">House</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bedrooms} onValueChange={setBedrooms}>
          <SelectTrigger>
            <SelectValue placeholder="Bedrooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="1">1+</SelectItem>
            <SelectItem value="2">2+</SelectItem>
            <SelectItem value="3">3+</SelectItem>
            <SelectItem value="4">4+</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Min Price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Max Price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>
      <Button onClick={onSearch} className="w-full">
        <SlidersHorizontal className="w-4 h-4 mr-2" />
        Apply Filters
      </Button>
    </div>
  );
}
