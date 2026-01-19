import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle } from 'lucide-react';
import ClaimListingModal from './ClaimListingModal';

export default function AddScrapedCharter() {
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState<any>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    website: '',
    phone: '',
    email: ''
  });

  const checkDuplicate = async () => {
    setLoading(true);
    setDuplicate(null);

    try {
      const { data, error } = await supabase.functions.invoke('listing-deduplication', {
        body: {
          action: 'check-duplicate',
          businessName: formData.businessName,
          website: formData.website,
          phone: formData.phone
        }
      });

      if (error) throw error;

      if (data.isDuplicate) {
        setDuplicate(data.existing);
        toast.warning('This listing already exists!');
      } else {
        toast.success('No duplicates found. You can create this listing.');
      }
    } catch (error: any) {
      toast.error('Failed to check duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await checkDuplicate();
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">Add Your Charter Business</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Business Name *</Label>
          <Input
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label>Website</Label>
          <Input
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://yourcharter.com"
          />
        </div>
        
        <div>
          <Label>Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>
        
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        {duplicate && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Duplicate Found!</strong> A listing for "{duplicate.business_name}" already exists.
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={() => setShowClaim(true)}
              >
                Claim This Listing
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Checking...' : 'Check for Duplicates'}
        </Button>
      </form>

      {duplicate && (
        <ClaimListingModal
          isOpen={showClaim}
          onClose={() => setShowClaim(false)}
          listingId={duplicate.id}
          listingName={duplicate.business_name}
        />
      )}
    </Card>
  );
}
