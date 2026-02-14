import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter';
import { optimisticBooking } from '@/lib/transactionManager';
import SecurePaymentProcessor from './SecurePaymentProcessor';
import DOMPurify from 'isomorphic-dompurify';

interface BookingFlowOptimizedProps {
  isOpen: boolean;
  onClose: () => void;
  charter: any;
}

export default function BookingFlowOptimized({ isOpen, onClose, charter }: BookingFlowOptimizedProps) {
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', date: '', guests: 2, duration: 'Half Day', requests: ''
  });
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const price = formData.duration === 'Half Day' ? charter.priceHalfDay : charter.priceFullDay;

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting
    if (!rateLimiter.limit(`booking_${formData.email}`, RATE_LIMITS.BOOKING)) {
      toast.error('Too many booking attempts. Please wait.');
      return;
    }

    setLoading(true);

    try {
      // Sanitize inputs
      const sanitized = {
        ...formData,
        name: DOMPurify.sanitize(formData.name),
        requests: DOMPurify.sanitize(formData.requests)
      };

      // Check availability
      const { data: available } = await supabase.functions.invoke('availability-manager', {
        body: { 
          action: 'check',
          captainId: charter.id,
          date: sanitized.date
        }
      });

      if (!available?.isAvailable) {
        toast.error('This date is no longer available');
        return;
      }

      // Create booking with optimistic locking
      const booking: any = await optimisticBooking(charter.id, sanitized.date, {
        charter_id: charter.id,
        captain_id: charter.id,
        customer_name: sanitized.name,
        customer_email: sanitized.email,
        customer_phone: sanitized.phone,
        booking_date: sanitized.date,
        guests: sanitized.guests,
        duration: sanitized.duration,
        special_requests: sanitized.requests,
        total_price: price,
        status: 'pending_payment',
        payment_status: 'pending'
      });

      setBookingId(booking.id);
      setStep('payment');
    } catch (error: any) {
      toast.error(error.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Booking confirmed!');
    onClose();
    window.location.href = `/payment-success?booking=${bookingId}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'details' ? 'Booking Details' : 'Secure Payment'}
          </DialogTitle>
        </DialogHeader>

        {step === 'details' ? (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" required value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" required value={formData.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="guests">Guests *</Label>
              <Input id="guests" type="number" min="1" max="20" required value={formData.guests}
                onChange={(e) => setFormData({...formData, guests: parseInt(e.target.value)})} />
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <div className="flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="text-2xl font-bold">${price}</span>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : 'Continue to Payment'}
            </Button>
          </form>
        ) : (
          <SecurePaymentProcessor
            bookingData={{ ...formData, captainId: charter.id }}
            amount={price}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setStep('details')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
