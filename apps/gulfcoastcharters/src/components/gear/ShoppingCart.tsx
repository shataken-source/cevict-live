import { useState } from 'react';
import { MarineProduct } from '@/types/marineProduct';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MultiPaymentCheckout from './MultiPaymentCheckout';

interface CartItem extends MarineProduct {
  quantity: number;
}

interface Props {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function ShoppingCartSheet({ items, onUpdateQuantity, onRemove, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    for (const item of items) {
      try {
        await supabase.functions.invoke('affiliate-click-tracker', {
          body: {
            productId: item.id,
            productName: item.name,
            retailer: item.retailer,
            eventType: 'checkout'
          }
        });
      } catch (error) {
        console.error('Failed to track:', error);
      }
    }
    setCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    onClear();
    setOpen(false);
  };


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="w-5 h-5" />
          {itemCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({itemCount} items)</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 border-b pb-4">
                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{item.name}</h4>
                  <p className="text-xs text-gray-500 capitalize">{item.retailer}</p>
                  <p className="text-blue-600 font-bold mt-1">${item.price}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => onRemove(item.id)}
                      className="ml-auto"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Subtotal:</span>
                <span className="text-blue-600">${subtotal.toFixed(2)}</span>
              </div>
              
              <Button onClick={handleCheckout} className="w-full" size="lg">
                Proceed to Checkout
              </Button>
              
              <Button onClick={onClear} variant="outline" className="w-full">
                Clear Cart
              </Button>
            </div>
          </div>
        )}
      </SheetContent>

      <MultiPaymentCheckout
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={subtotal}
        onSuccess={handlePaymentSuccess}
      />
    </Sheet>
  );
}
