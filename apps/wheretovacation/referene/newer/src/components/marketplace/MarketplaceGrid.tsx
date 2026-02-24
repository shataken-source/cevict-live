import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import ListingCard from './ListingCard';
import CreateListingModal from './CreateListingModal';
import ListingDetailModal from './ListingDetailModal';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketplaceGrid() {
  const [listings, setListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadListings();
  }, []);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, searchTerm, categoryFilter, sortBy]);

  const loadListings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'get_listings' }
      });

      if (error) throw error;
      setListings(data.listings || []);
    } catch (error: any) {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...listings];

    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(l => l.category === categoryFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_low': return a.price - b.price;
        case 'price_high': return b.price - a.price;
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredListings(filtered);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Marine Marketplace</h1>
        {user && (
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Listing
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="boats">Boats</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="fishing_gear">Fishing Gear</SelectItem>
            <SelectItem value="safety_equipment">Safety Equipment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price_low">Price: Low to High</SelectItem>
            <SelectItem value="price_high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No listings found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => setSelectedListing(listing)}
            />
          ))}
        </div>
      )}

      {createModalOpen && user && (
        <CreateListingModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={loadListings}
          userId={user.id}
        />
      )}

      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          open={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          currentUserId={user?.id}
          onUpdate={loadListings}
        />
      )}
    </div>
  );
}
