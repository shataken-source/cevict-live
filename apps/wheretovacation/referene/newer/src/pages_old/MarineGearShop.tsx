import { useState, useMemo, useEffect } from 'react';
import { marineProducts } from '@/data/marineProducts';
import { MarineProduct } from '@/types/marineProduct';
import MarineProductCardEnhanced from '@/components/MarineProductCardEnhanced';
import MarineGearFilters from '@/components/MarineGearFilters';
import ProductQuickView from '@/components/gear/ProductQuickView';
import ShoppingCartSheet from '@/components/gear/ShoppingCart';
import FrequentlyBoughtTogether from '@/components/gear/FrequentlyBoughtTogether';
import { ProductRecommendations } from '@/components/gear/ProductRecommendations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingBag, Search, TrendingUp, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface CartItem extends MarineProduct {
  quantity: number;
}

export default function MarineGearShop() {
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    retailer: 'all',
    minPrice: '',
    maxPrice: '',
    inStock: false,
    sortBy: 'featured'
  });
  
  const [quickViewProduct, setQuickViewProduct] = useState<MarineProduct | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [userId, setUserId] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...marineProducts];

    if (filters.search) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.category !== 'all') {
      result = result.filter(p => p.category === filters.category);
    }

    if (filters.retailer !== 'all') {
      result = result.filter(p => p.retailer === filters.retailer);
    }

    if (filters.minPrice) {
      result = result.filter(p => p.price >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      result = result.filter(p => p.price <= parseFloat(filters.maxPrice));
    }

    if (filters.inStock) {
      result = result.filter(p => p.inStock);
    }

    switch (filters.sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'reviews':
        result.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      default:
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [filters]);

  const addToCart = (product: MarineProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    toast({
      title: "Added to cart",
      description: `${product.name} added successfully`,
    });

    // Track product view
    if (userId) {
      supabase.functions.invoke('product-recommendations', {
        body: {
          userId,
          productId: product.id,
          action: 'track-view'
        }
      });
    }
  };

  const addMultipleToCart = (products: MarineProduct[]) => {
    products.forEach(product => {
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => 
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...prev, { ...product, quantity: 1 }];
      });
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput }));
  };

  const featuredProducts = marineProducts.filter(p => p.featured).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="w-12 h-12" />
            <h1 className="text-4xl font-bold">Marine Gear Shop</h1>
          </div>
          <p className="text-xl mb-6">AI-Powered Recommendations • Premium Equipment from Top Retailers</p>
          
          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="flex gap-2">
              <Input
                placeholder="Search for marine gear..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-white text-black"
              />
              <Button onClick={handleSearch} size="lg">
                <Search className="w-5 h-5" />
              </Button>
              <ShoppingCartSheet
                items={cart}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                onClear={() => setCart([])}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* AI-Powered Frequently Bought Together */}
        {featuredProducts.length > 0 && (
          <div className="mb-8">
            <FrequentlyBoughtTogether
              mainProduct={featuredProducts[0]}
              allProducts={marineProducts}
              onAddToCart={addMultipleToCart}
              userId={userId}
            />
          </div>
        )}

        {/* Best Sellers */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold">Best Sellers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredProducts.map(product => (
              <div key={product.id} className="flex gap-3 bg-white p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setQuickViewProduct(product)}>
                <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded" />
                <div>
                  <h4 className="font-semibold text-sm line-clamp-2">{product.name}</h4>
                  <p className="text-blue-600 font-bold">${product.price}</p>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="mt-1">
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Main Shop */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <MarineGearFilters filters={filters} onFilterChange={setFilters} />
          </div>

          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                  All Products
                </h2>
                <p className="text-gray-600">{filteredProducts.length} products found</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <MarineProductCardEnhanced
                  key={product.id}
                  product={product}
                  onQuickView={setQuickViewProduct}
                  onAddToCart={addToCart}
                />
              ))}
            </div>

            {/* AI-Powered Recommendations */}
            <ProductRecommendations
              allProducts={marineProducts}
              userId={userId}
            />
          </div>
        </div>
      </div>

      <ProductQuickView
        product={quickViewProduct}
        open={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={addToCart}
      />
    </div>
  );
}
