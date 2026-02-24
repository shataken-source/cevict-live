import { MarineProduct } from '@/types/marineProduct';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, Heart, Share2, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  product: MarineProduct | null;
  open: boolean;
  onClose: () => void;
  onAddToCart?: (product: MarineProduct) => void;
}

export default function ProductQuickView({ product, open, onClose, onAddToCart }: Props) {
  if (!product) return null;

  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const handleBuyNow = async () => {
    try {
      await supabase.functions.invoke('affiliate-click-tracker', {
        body: {
          productId: product.id,
          productName: product.name,
          retailer: product.retailer,
          eventType: 'purchase'
        }
      });
    } catch (error) {
      console.error('Failed to track:', error);
    }
    window.open(product.affiliateLink, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <img src={product.image} alt={product.name} className="w-full rounded-lg" />
            {product.fastShipping && (
              <div className="flex items-center gap-2 mt-4 text-green-600">
                <Truck className="w-5 h-5" />
                <span className="font-semibold">Fast & Free Shipping</span>
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="capitalize">{product.retailer}</Badge>
              {discount > 0 && <Badge className="bg-red-500">Save {discount}%</Badge>}
              {product.featured && <Badge className="bg-blue-500">Featured</Badge>}
            </div>

            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
              ))}
              <span className="ml-2 text-gray-600">{product.rating} ({product.reviewCount} reviews)</span>
            </div>

            <p className="text-gray-700 mb-6">{product.description}</p>

            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-blue-600">${product.price}</span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-400 line-through">${product.originalPrice}</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Button onClick={handleBuyNow} className="w-full" size="lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Buy Now at {product.retailer.charAt(0).toUpperCase() + product.retailer.slice(1)}
              </Button>
              
              {onAddToCart && (
                <Button onClick={() => onAddToCart(product)} variant="outline" className="w-full" size="lg">
                  Add to Cart
                </Button>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Heart className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Why buy through us?</strong> We earn a small commission at no extra cost to you, 
                helping us keep Gulf Coast Charters free for everyone!
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
