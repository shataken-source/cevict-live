import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutForm } from './CheckoutForm';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any;
}

export function BookingModal({ isOpen, onClose, property }: BookingModalProps) {
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(2);
  const [requests, setRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();


  const calculateTotal = () => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights * property.price_per_night;
  };

  const handleBooking = async () => {
    if (!user) {
      toast({ title: 'Please sign in to book', variant: 'destructive' });
      return;
    }
    if (!checkIn || !checkOut) {
      toast({ title: 'Please select dates', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from('bookings').insert({
      property_id: property.id,
      user_id: user.id,
      check_in: checkIn.toISOString(),
      check_out: checkOut.toISOString(),
      guests,
      total_price: calculateTotal(),
      status: 'pending',
      special_requests: requests,
      payment_status: 'pending'
    }).select().single();

    setLoading(false);
    if (error) {
      toast({ title: 'Booking failed', description: error.message, variant: 'destructive' });
    } else {
      setBookingId(data.id);
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = () => {
    toast({ title: 'Payment successful!', description: 'Your booking is confirmed' });
    onClose();
    setShowPayment(false);
    setBookingId(null);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{showPayment ? 'Complete Payment' : `Book ${property.title}`}</DialogTitle>
        </DialogHeader>
        {!showPayment ? (
          <div className="space-y-4">
            <div>
              <Label>Check-in Date</Label>
              <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} disabled={(date) => date < new Date()} />
            </div>
            <div>
              <Label>Check-out Date</Label>
              <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={(date) => date < new Date()} />
            </div>
            <div>
              <Label>Special Requests</Label>
              <Textarea value={requests} onChange={(e) => setRequests(e.target.value)} />
            </div>
            <div className="border-t pt-4">
              <p className="text-lg font-bold">Total: ${calculateTotal()}</p>
            </div>
            <Button onClick={handleBooking} disabled={loading} className="w-full">
              {loading ? 'Processing...' : 'Continue to Payment'}
            </Button>
          </div>
        ) : (
          <CheckoutForm
            bookingId={bookingId!}
            amount={calculateTotal()}
            propertyName={property.title}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

