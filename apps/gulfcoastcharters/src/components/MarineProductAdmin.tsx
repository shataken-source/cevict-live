import { useState } from 'react';
import { MarineProduct } from '@/types/marineProduct';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Props {
  products: MarineProduct[];
  onSave: (product: MarineProduct) => void;
  onDelete: (id: string) => void;
}

export default function MarineProductAdmin({ products, onSave, onDelete }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<MarineProduct>>({
    name: '',
    description: '',
    price: 0,
    category: 'safety',
    retailer: 'amazon',
    affiliateLink: '',
    rating: 5,
    reviewCount: 0,
    inStock: true,
    image: ''
  });

  const handleSubmit = () => {
    if (editingProduct.name && editingProduct.price) {
      onSave({
        ...editingProduct,
        id: editingProduct.id || Date.now().toString()
      } as MarineProduct);
      setIsOpen(false);
      setEditingProduct({
        name: '',
        description: '',
        price: 0,
        category: 'safety',
        retailer: 'amazon',
        affiliateLink: '',
        rating: 5,
        reviewCount: 0,
        inStock: true,
        image: ''
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Marine Products Management</h2>
        <Button onClick={() => { setEditingProduct({}); setIsOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="grid gap-4">
        {products.map(product => (
          <Card key={product.id} className="p-4">
            <div className="flex gap-4">
              <img src={product.image} alt={product.name} className="w-24 h-24 object-cover rounded" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.description}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="font-bold">${product.price}</span>
                  <span className="capitalize">{product.category}</span>
                  <span className="capitalize">{product.retailer}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditingProduct(product); setIsOpen(true); }}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(product.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editingProduct.description}
                onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Original Price (optional)</Label>
                <Input
                  type="number"
                  value={editingProduct.originalPrice || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Image URL</Label>
              <Input
                value={editingProduct.image}
                onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={editingProduct.category} onValueChange={(v: any) => setEditingProduct({ ...editingProduct, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Safety Gear</SelectItem>
                    <SelectItem value="fishing">Fishing Equipment</SelectItem>
                    <SelectItem value="accessories">Boat Accessories</SelectItem>
                    <SelectItem value="navigation">Navigation</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Retailer</Label>
                <Select value={editingProduct.retailer} onValueChange={(v: any) => setEditingProduct({ ...editingProduct, retailer: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amazon">Amazon</SelectItem>
                    <SelectItem value="boatus">BoatUS</SelectItem>
                    <SelectItem value="walmart">Walmart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Affiliate Link</Label>
              <Input
                value={editingProduct.affiliateLink}
                onChange={(e) => setEditingProduct({ ...editingProduct, affiliateLink: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rating (1-5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={editingProduct.rating}
                  onChange={(e) => setEditingProduct({ ...editingProduct, rating: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Review Count</Label>
                <Input
                  type="number"
                  value={editingProduct.reviewCount}
                  onChange={(e) => setEditingProduct({ ...editingProduct, reviewCount: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editingProduct.inStock}
                onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, inStock: checked })}
              />
              <Label>In Stock</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editingProduct.featured}
                onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, featured: checked })}
              />
              <Label>Featured Product</Label>
            </div>

            <Button onClick={handleSubmit} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
