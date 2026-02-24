import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import StripeCheckoutFlow from '@/components/StripeCheckoutFlow';

interface EnhancedBookingModalProps {
  charter: any;
  open: boolean;
  onClose: () => void;
}

export default function EnhancedBookingModal({ charter, open, onClose }: EnhancedBookingModalProps) {
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [bookingData, setBookingData] = useState({
    charterId: charter.id,
    bookingDate: new Date(),
    bookingType: 'half-day',
    numGuests: 1,
    specialRequests: '',
    totalAmount: charter.priceHalfDay * 100,
  });

  const handleNext = () => setStep('payment');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book {charter.name}</DialogTitle>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-4">
            <div>
              <Label>Booking Date</Label>
              <Calendar
                mode="single"
                selected={bookingData.bookingDate}
                onSelect={(date) => date && setBookingData({ ...bookingData, bookingDate: date })}
              />
            </div>
            <div>
              <Label>Trip Type</Label>
              <select
                className="w-full p-2 border rounded"
                value={bookingData.bookingType}
                onChange={(e) => setBookingData({
                  ...bookingData,
                  bookingType: e.target.value,
                  totalAmount: e.target.value === 'half-day' ? charter.priceHalfDay * 100 : charter.priceFullDay * 100
                })}
              >
                <option value="half-day">Half Day - ${charter.priceHalfDay}</option>
                <option value="full-day">Full Day - ${charter.priceFullDay}</option>
              </select>
            </div>
            <div>
              <Label>Number of Guests</Label>
              <Input
                type="number"
                min="1"
                value={bookingData.numGuests}
                onChange={(e) => setBookingData({ ...bookingData, numGuests: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Special Requests</Label>
              <Textarea
                value={bookingData.specialRequests}
                onChange={(e) => setBookingData({ ...bookingData, specialRequests: e.target.value })}
              />
            </div>
            <Button onClick={handleNext} className="w-full">Continue to Payment</Button>
          </div>
        )}

        {step === 'payment' && (
          <StripeCheckoutFlow bookingData={bookingData} onSuccess={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}