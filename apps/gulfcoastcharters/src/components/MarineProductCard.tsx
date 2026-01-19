import { MarineProduct } from '@/types/marineProduct';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';


interface Props {
  product: MarineProduct;
  onCompare: (product: MarineProduct) => void;
  onViewDetails: (product: MarineProduct) => void;
}

export default function MarineProductCard({ product, onCompare, onViewDetails }: Props) {
  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const trackClick = async () => {
    try {
      await supabase.functions.invoke('affiliate-click-tracker', {
        body: {
          productId: product.id,
          productName: product.name,
          retailer: product.retailer,
          eventType: 'click'
        }
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
    window.open(product.affiliateLink, '_blank');
  };


  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
        {discount > 0 && (
          <Badge className="absolute top-2 right-2 bg-red-500">-{discount}%</Badge>
        )}
        {product.featured && (
          <Badge className="absolute top-2 left-2 bg-blue-500">Featured</Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
          ))}
          <span className="text-sm text-gray-600 ml-1">({product.reviewCount})</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl font-bold text-blue-600">${product.price}</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
          )}
        </div>

        <Badge variant="outline" className="mb-3 capitalize">{product.retailer}</Badge>

        <div className="flex gap-2">
          <Button onClick={trackClick} className="flex-1">

            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy Now
          </Button>
          <Button variant="outline" onClick={() => onViewDetails(product)}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
        
        <Button variant="ghost" className="w-full mt-2" onClick={() => onCompare(product)}>
          Add to Compare
        </Button>
      </div>
    </Card>
  );
}
