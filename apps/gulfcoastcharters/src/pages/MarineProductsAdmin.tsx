import { useState } from 'react';
import { marineProducts } from '@/data/marineProducts';
import { MarineProduct } from '@/types/marineProduct';
import MarineProductAdmin from '@/components/MarineProductAdmin';
import { useToast } from '@/hooks/use-toast';

export default function MarineProductsAdmin() {
  const [products, setProducts] = useState<MarineProduct[]>(marineProducts);
  const { toast } = useToast();

  const handleSave = (product: MarineProduct) => {
    const existingIndex = products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...products];
      updated[existingIndex] = product;
      setProducts(updated);
      toast({ title: 'Product updated', description: 'Product has been successfully updated' });
    } else {
      setProducts([...products, product]);
      toast({ title: 'Product added', description: 'New product has been added successfully' });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
      toast({ title: 'Product deleted', description: 'Product has been removed' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <MarineProductAdmin 
          products={products}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
