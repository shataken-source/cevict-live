import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingDate: string;
  totalPrice: number;
  onSuccess: () => void;
}

export default function CancellationModal({ isOpen, onClose, bookingId, bookingDate, totalPrice, onSuccess }: CancellationModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const daysUntilBooking = Math.ceil((new Date(bookingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const refundPercentage = daysUntilBooking >= 7 ? 100 : daysUntilBooking >= 3 ? 50 : 0;
  const refundAmount = (totalPrice * refundPercentage) / 100;

  const handleCancel = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    try {
      // Server must compute refund amount — never trust client-calculated values
      const { error } = await supabase.functions.invoke('cancel-booking', {
        body: { bookingId, reason }
      });

      if (error) throw error;

      alert(`Booking cancelled. Refund of $${refundAmount} will be processed within 5-7 business days.`);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to cancel booking. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-900 mb-1">Cancellation Policy</p>
              <p className="text-yellow-800">
                • 7+ days: 100% refund<br />
                • 3-6 days: 50% refund<br />
                • Less than 3 days: No refund
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Days until booking: <span className="font-bold">{daysUntilBooking}</span></p>
            <p className="text-sm text-gray-600 mb-1">Original amount: <span className="font-bold">${totalPrice}</span></p>
            <p className="text-lg font-bold text-blue-900">Refund amount: ${refundAmount}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reason for cancellation</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please tell us why you're cancelling..."
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Keep Booking</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={loading} className="flex-1">
              {loading ? 'Processing...' : 'Cancel Booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
