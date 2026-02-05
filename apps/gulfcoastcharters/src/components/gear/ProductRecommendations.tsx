import { useState, useEffect } from 'react';
import { MarineProduct } from '@/types/marineProduct';
import MarineProductCard from '@/components/MarineProductCard';


import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface ProductRecommendationsProps {
  currentProductId?: string;
  allProducts: MarineProduct[];
  userId?: string;
}

export function ProductRecommendations({ currentProductId, allProducts, userId }: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<MarineProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [currentProductId, userId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('product-recommendations', {
        body: {
          userId: userId || 'anonymous',
          productId: currentProductId,
          action: 'get-recommendations',
          products: allProducts
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        const recommendedProducts = allProducts.filter(p => 
          data.recommendations.includes(p.id)
        ).slice(0, 6);
        setRecommendations(recommendedProducts);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Fallback to random products
      const shuffled = [...allProducts].sort(() => Math.random() - 0.5);
      setRecommendations(shuffled.slice(0, 6));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map(product => (
          <MarineProductCard 
            key={product.id} 
            product={product}
          />
        ))}

      </div>
    </div>
  );
}
