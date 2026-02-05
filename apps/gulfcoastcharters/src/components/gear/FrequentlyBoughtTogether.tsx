import { MarineProduct } from '@/types/marineProduct';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ShoppingCart, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Props {
  mainProduct: MarineProduct;
  allProducts: MarineProduct[];
  onAddToCart: (products: MarineProduct[]) => void;
  userId?: string;
}

export default function FrequentlyBoughtTogether({ mainProduct, allProducts, onAddToCart, userId }: Props) {
  const [selected, setSelected] = useState<string[]>([mainProduct.id]);
  const [relatedProducts, setRelatedProducts] = useState<MarineProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRelatedProducts();
  }, [mainProduct.id]);

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('product-recommendations', {
        body: {
          userId: userId || 'anonymous',
          productId: mainProduct.id,
          action: 'frequently-bought-together',
          products: allProducts
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        const products = allProducts.filter(p => 
          data.recommendations.includes(p.id) && p.id !== mainProduct.id
        ).slice(0, 3);
        setRelatedProducts(products);
        // Auto-select first related product
        if (products.length > 0) {
          setSelected([mainProduct.id, products[0].id]);
        }
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
      // Fallback: show products from same category
      const sameCategory = allProducts
        .filter(p => p.category === mainProduct.category && p.id !== mainProduct.id)
        .slice(0, 3);
      setRelatedProducts(sameCategory);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (id: string) => {
    if (id === mainProduct.id) return;
    setSelected(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleAddToCart = () => {
    const productsToAdd = [mainProduct, ...relatedProducts].filter(p => selected.includes(p.id));
    onAddToCart(productsToAdd);
    toast({
      title: "Added to cart",
      description: `${productsToAdd.length} item(s) added successfully`,
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </Card>
    );
  }

  if (relatedProducts.length === 0) return null;

  const displayProducts = [mainProduct, ...relatedProducts];
  const selectedProducts = displayProducts.filter(p => selected.includes(p.id));
  const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const totalSavings = selectedProducts.reduce((sum, p) => 
    p.originalPrice ? sum + (p.originalPrice - p.price) : sum, 0
  );

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Frequently Bought Together</h3>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-start">
          {displayProducts.map((product, idx) => (
            <div key={product.id} className="flex items-start gap-2">
              {idx > 0 && <Plus className="w-6 h-6 text-gray-400 mt-12" />}
              <div className="text-center">
                <div className="relative">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-24 h-24 object-cover rounded border-2 border-gray-200"
                  />
                  {product.id !== mainProduct.id && (
                    <div className="absolute -top-2 -right-2">
                      <Checkbox
                        checked={selected.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs mt-2 max-w-[100px] line-clamp-2">{product.name}</p>
                <p className="text-sm font-bold text-blue-600">${product.price}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Total for {selectedProducts.length} items:</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-blue-600">${totalPrice.toFixed(2)}</span>
              {totalSavings > 0 && (
                <p className="text-sm text-green-600">Save ${totalSavings.toFixed(2)}</p>
              )}
            </div>
          </div>
          
          <Button 
            onClick={handleAddToCart} 
            className="w-full" 
            size="lg"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Add {selectedProducts.length} to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}
