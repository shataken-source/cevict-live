import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import SMSVerificationModal from './SMSVerificationModal';

interface ClaimListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingName: string;
}

export default function ClaimListingModal({ isOpen, onClose, listingId, listingName }: ClaimListingModalProps) {
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formData, setFormData] = useState({
    captainName: '',
    captainEmail: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('claim-listing', {
        body: {
          listingId,
          captainName: formData.captainName,
          captainEmail: formData.captainEmail,
          phone: formData.phone,
          action: 'claim'
        }
      });

      if (error) throw error;

      if (data.requiresVerification) {
        setPhoneNumber(data.phoneNumber || formData.phone);
        setShowVerification(true);
        toast.success('Verification code sent to your email!');

      } else {
        toast.success('Claim request submitted!');
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit claim request');
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = () => {
    toast.success('Listing claimed successfully! You now have full access.');
    setFormData({ captainName: '', captainEmail: '', phone: '' });
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showVerification} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Claim This Listing</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Business Name</Label>
              <Input value={listingName} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label htmlFor="captainName">Your Name *</Label>
              <Input
                id="captainName"
                value={formData.captainName}
                onChange={(e) => setFormData({ ...formData, captainName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="captainEmail">Email *</Label>
              <Input
                id="captainEmail"
                type="email"
                value={formData.captainEmail}
                onChange={(e) => setFormData({ ...formData, captainEmail: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Claim'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SMSVerificationModal
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
        email={formData.captainEmail}
        captainEmail={formData.captainEmail}
        listingId={listingId}
        onVerified={handleVerified}
      />

    </>
  );
}
