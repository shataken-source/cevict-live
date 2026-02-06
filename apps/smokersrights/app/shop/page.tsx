'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Filter, Shield } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  link: string;
  sponsor?: boolean;
  commission?: string;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setProducts(data.products || []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const sponsorProducts = products.filter(p => p.sponsor);
  const regularProducts = products.filter(p => !p.sponsor);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <ShoppingBag className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🛡️ SAFE HAVEN MARKETPLACE
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Support SmokersRights while shopping smoker-approved products
          </p>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat} ({cat === 'all' ? products.length : products.filter(p => p.category === cat).length})
              </button>
            ))}
          </div>
        </div>

        {/* Sponsor Products */}
        {sponsorProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-yellow-600" />
              SPONSOR
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sponsorProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-yellow-50 border-3 border-yellow-500 rounded-lg p-6 shadow-lg"
                >
                  <div className="text-xs font-bold text-yellow-800 mb-2 uppercase">SPONSOR</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-sm text-gray-700 mb-4 line-clamp-3">{product.description}</p>
                  <div className="text-xl font-bold text-yellow-700 mb-4">{product.price}</div>
                  <a
                    href={`${product.link}${product.link.includes('?') ? '&' : '?'}subid=smokersrights`}
                    target="_blank"
                    rel="noopener sponsored"
                    className="block bg-yellow-600 hover:bg-yellow-700 text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors"
                  >
                    Shop Now →
                  </a>
                  {product.commission && (
                    <p className="text-xs text-gray-500 mt-2 text-center">Earn {product.commission}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Products */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : regularProducts.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">PRODUCTS</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-all"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-sm text-gray-700 mb-4 line-clamp-3">{product.description}</p>
                  <div className="text-xl font-bold text-gray-900 mb-4">{product.price}</div>
                  <a
                    href={`${product.link}${product.link.includes('?') ? '&' : '?'}subid=smokersrights`}
                    target="_blank"
                    rel="noopener"
                    className="block bg-gray-900 hover:bg-gray-800 text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors"
                  >
                    Shop Now →
                  </a>
                  {product.commission && (
                    <p className="text-xs text-gray-500 mt-2 text-center">Earn {product.commission}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Check back soon for new products.</p>
          </div>
        )}

        {/* FTC Disclosure */}
        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 mt-12">
          <p className="text-sm text-gray-900 leading-relaxed">
            <strong>⚠️ FTC Disclosure:</strong> SmokersRights.com earns commissions from affiliate purchases. All products are legal for adults 21+. Prices and availability subject to change. We only promote products we believe in. Your purchase supports our advocacy work.
          </p>
        </div>
      </div>
    </div>
  );
}
