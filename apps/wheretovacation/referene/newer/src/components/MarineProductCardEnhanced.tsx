import { MarineProduct } from '@/types/marineProduct';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, Eye, Heart, Truck, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  product: MarineProduct;
  onQuickView: (product: MarineProduct) => void;
  onAddToCart: (product: MarineProduct) => void;
}

export default function MarineProductCardEnhanced({ product, onQuickView, onAddToCart }: Props) {
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
      console.error('Failed to track:', error);
    }
    window.open(product.affiliateLink, '_blank');
  };

  const getRetailerBadge = () => {
    const colors = {
      amazon: 'bg-orange-500',
      walmart: 'bg-blue-600',
      temu: 'bg-purple-500',
      boatus: 'bg-cyan-600'
    };
    return colors[product.retailer] || 'bg-gray-500';
  };

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300">
      <div className="relative overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-300" 
        />
        
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <Badge className="bg-red-600 text-white font-bold">-{discount}% OFF</Badge>
          )}
          {product.featured && (
            <Badge className="bg-yellow-500 text-black font-bold flex items-center gap-1">
              <Zap className="w-3 h-3" /> Best Seller
            </Badge>
          )}
        </div>

        <div className="absolute top-2 right-2">
          <Button size="sm" variant="secondary" className="rounded-full w-8 h-8 p-0">
            <Heart className="w-4 h-4" />
          </Button>
        </div>

        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" onClick={() => onQuickView(product)}>
            <Eye className="w-4 h-4 mr-1" /> Quick View
          </Button>
        </div>
      </div>

      <div className="p-4">
        <Badge className={`${getRetailerBadge()} text-white mb-2 capitalize`}>
          {product.retailer}
        </Badge>

        {product.fastShipping && (
          <div className="flex items-center gap-1 text-green-600 text-xs mb-2">
            <Truck className="w-3 h-3" />
            <span className="font-semibold">Fast & Free Shipping</span>
          </div>
        )}

        <h3 className="font-bold text-lg mb-2 line-clamp-2 min-h-[56px]">{product.name}</h3>
        
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
            />
          ))}
          <span className="text-sm text-gray-600 ml-1">({product.reviewCount})</span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-blue-600">${product.price}</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => onAddToCart(product)} className="flex-1" size="sm">
            <ShoppingCart className="w-4 h-4 mr-1" />
            Add to Cart
          </Button>
          <Button onClick={trackClick} variant="outline" className="flex-1" size="sm">
            Buy Now
          </Button>
        </div>
      </div>
    </Card>
  );
}
