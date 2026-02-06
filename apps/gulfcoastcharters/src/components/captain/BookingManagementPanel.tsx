import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MessageSquare, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Booking {
  id: string;
  charterName: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  guests: number;
  totalPrice: number;
  status: string;
}

export function BookingManagementPanel({ bookings, onUpdate }: { bookings: Booking[]; onUpdate: () => void }) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAccept = async (bookingId: string) => {
    setProcessing(bookingId);
    try {
      const response = await fetch('/api/captain/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acceptBooking', bookingId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Booking accepted!');
        onUpdate();
      } else {
        toast.error('Failed to accept booking');
      }
    } catch (error) {
      toast.error('Failed to accept booking');
    }
    setProcessing(null);
  };

  const handleDecline = async (bookingId: string) => {
    setProcessing(bookingId);
    try {
      const response = await fetch('/api/captain/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'declineBooking', bookingId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Booking declined');
        onUpdate();
      } else {
        toast.error('Failed to decline booking');
      }
    } catch (error) {
      toast.error('Failed to decline booking');
    }
    setProcessing(null);
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Pending Bookings</h2>
      {pendingBookings.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No pending bookings
        </Card>
      ) : (
        pendingBookings.map((booking) => (
          <Card key={booking.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{booking.charterName}</h3>
                <p className="text-sm text-gray-600 mb-1">Customer: {booking.customerName}</p>
                <p className="text-sm text-gray-600 mb-1">Date: {booking.bookingDate} at {booking.bookingTime}</p>
                <p className="text-sm text-gray-600 mb-1">Guests: {booking.guests}</p>
                <p className="text-lg font-bold text-green-600 mt-2">${booking.totalPrice}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAccept(booking.id)} disabled={processing === booking.id}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDecline(booking.id)} disabled={processing === booking.id}>
                  <XCircle className="w-4 h-4 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
