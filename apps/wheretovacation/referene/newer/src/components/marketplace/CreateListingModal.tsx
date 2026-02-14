import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

interface CreateListingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export default function CreateListingModal({ open, onClose, onSuccess, userId }: CreateListingModalProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'fishing_gear',
    condition: 'good',
    price: '',
    negotiable: true,
    location: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files).slice(0, 5));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const imageUrls: string[] = [];
      
      for (const image of images) {
        const fileName = `${Date.now()}-${image.name}`;
        const { data, error } = await supabase.storage
          .from('boat-photos')
          .upload(fileName, image);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('boat-photos')
          .getPublicUrl(fileName);
        
        imageUrls.push(publicUrl);
      }

      const { data, error } = await supabase.functions.invoke('marketplace-manager', {
        body: {
          action: 'create_listing',
          seller_id: userId,
          ...formData,
          price: parseFloat(formData.price),
          images: imageUrls
        }
      });

      if (error) throw error;

      toast.success('Listing created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Garmin Fishfinder GPS"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the item..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boats">Boats</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="fishing_gear">Fishing Gear</SelectItem>
                  <SelectItem value="safety_equipment">Safety Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="like_new">Like New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="for_parts">For Parts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                required
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, State"
              />
            </div>
          </div>

          <div>
            <Label>Images (up to 5)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer text-blue-600 hover:underline">
                Click to upload images
              </label>
              {images.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">{images.length} image(s) selected</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Listing'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
