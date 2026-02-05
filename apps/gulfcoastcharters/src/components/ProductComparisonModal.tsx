import { MarineProduct } from '@/types/marineProduct';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Star, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  products: MarineProduct[];
  onClose: () => void;
  onRemove: (id: string) => void;
}

export default function ProductComparisonModal({ products, onClose, onRemove }: Props) {
  if (products.length === 0) return null;

  return (
    <Dialog open={products.length > 0} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Products ({products.length})</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id} className="border rounded-lg p-4 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => onRemove(product.id)}
              >
                <X className="w-4 h-4" />
              </Button>
              
              <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded mb-3" />
              <h3 className="font-semibold mb-2">{product.name}</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-bold text-blue-600">${product.price}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rating:</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{product.rating}</span>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Retailer:</span>
                  <Badge variant="outline" className="capitalize">{product.retailer}</Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock:</span>
                  <span className={product.inStock ? 'text-green-600' : 'text-red-600'}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={() => window.open(product.affiliateLink, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Product
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
