import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import TimeSlotSelector from './booking/TimeSlotSelector';

interface BookingModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
}

export default function BookingModificationModal({ isOpen, onClose, booking }: BookingModificationModalProps) {
  const [action, setAction] = useState<'reschedule' | 'cancel' | null>(null);
  const [newDate, setNewDate] = useState<Date>();
  const [newTime, setNewTime] = useState('');

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      toast.error('Please select a new date and time');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('booking-modification', {
        body: {
          action: 'reschedule',
          bookingId: booking.id,
          newDate: newDate.toISOString(),
          newTime,
        }
      });
      if (error) throw error;
      toast.success('Booking rescheduled! Confirmation email sent.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reschedule booking');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking? Refund amount will be calculated based on our cancellation policy.')) return;

    try {
      // Server calculates refund — never trust client-side amount
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { bookingId: booking.id }
      });
      if (error) throw error;
      toast.success(data?.message || 'Booking cancelled. Refund will be processed in 5-7 business days.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel booking');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modify Booking</DialogTitle>
        </DialogHeader>

        {!action ? (
          <div className="space-y-4">
            <Card className="p-4 bg-gray-50">
              <h4 className="font-semibold mb-2">Current Booking</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Charter:</span><span>{booking.charterName}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{booking.date}</span></div>
                <div className="flex justify-between"><span>Time:</span><span>{booking.time}</span></div>
                <div className="flex justify-between"><span>Guests:</span><span>{booking.guests}</span></div>
              </div>
            </Card>

            <div className="grid gap-3">
              <Button onClick={() => setAction('reschedule')} className="w-full" variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Reschedule Booking
              </Button>
              <Button onClick={() => setAction('cancel')} className="w-full" variant="destructive">
                <AlertCircle className="w-4 h-4 mr-2" />
                Cancel Booking
              </Button>
            </div>
          </div>
        ) : action === 'reschedule' ? (
          <div className="space-y-6">
            <div>
              <Label className="text-lg mb-3 block">Select New Date</Label>
              <Calendar mode="single" selected={newDate} onSelect={setNewDate}
                disabled={(date: Date) => date < new Date()} className="border rounded-lg" />
            </div>
            <div>
              <Label className="text-lg mb-3 block">Select New Time</Label>
              <TimeSlotSelector
                date={newDate}
                selectedTime={newTime}
                onTimeSelect={setNewTime}
                captainId={booking.charterId || booking.captainId || booking.id}
              />
            </div>
            <Card className="p-4 border-blue-300 bg-blue-50">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> Rescheduling is free if done 48+ hours before your original booking.
                A $25 fee applies for changes within 48 hours.
              </p>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setAction(null)}>Back</Button>
              <Button onClick={handleReschedule} className="flex-1">Confirm Reschedule</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="p-4 border-yellow-300 bg-yellow-50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Cancellation Policy
              </h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• <strong>7+ days:</strong> Full refund (${booking.amount})</li>
                <li>• <strong>3-7 days:</strong> 50% refund (${(booking.amount * 0.5).toFixed(2)})</li>
                <li>• <strong>Less than 3 days:</strong> No refund</li>
              </ul>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setAction(null)}>Back</Button>
              <Button onClick={handleCancel} variant="destructive" className="flex-1">
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
