import { useState, useEffect } from 'react';
import { Hero } from './Hero';
import { SearchFilters } from './SearchFilters';
import { PropertyCard } from './PropertyCard';
import { Footer } from './Footer';
import { supabase } from '@/lib/supabase';
import type { Property } from '@/types';
import { sampleProperties } from '@/data/properties';

export default function AppLayout() {
  const [properties, setProperties] = useState<Property[]>(sampleProperties);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('all');

  const handleExplore = () => {
    document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = async () => {
    let query = supabase.from('properties').select('*').eq('is_active', true);
    
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`);
    }
    if (propertyType !== 'all') {
      query = query.eq('property_type', propertyType);
    }
    if (minPrice) {
      query = query.gte('price_per_night', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('price_per_night', parseFloat(maxPrice));
    }
    if (bedrooms !== 'all') {
      query = query.gte('bedrooms', parseInt(bedrooms));
    }

    const { data } = await query;
    setProperties(data || sampleProperties);
  };

  const handleViewDetails = (property: Property) => {
    console.log('View property:', property);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero onExplore={handleExplore} />
      <section id="properties" className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">Find Your Perfect Stay</h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Luxury waterfront rentals at the world's most beautiful vacation destinations
          </p>

          <SearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            propertyType={propertyType}
            setPropertyType={setPropertyType}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            bedrooms={bedrooms}
            setBedrooms={setBedrooms}
            onSearch={handleSearch}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />

            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
