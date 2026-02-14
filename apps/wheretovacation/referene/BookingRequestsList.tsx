import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Booking } from '@/types';
import { Check, X, MessageSquare } from 'lucide-react';

interface BookingRequestsListProps {
  bookings: Booking[];
  onApprove: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
  onMessage: (bookingId: string) => void;
}

export function BookingRequestsList({ bookings, onApprove, onReject, onMessage }: BookingRequestsListProps) {
  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Requests ({pendingBookings.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending booking requests</p>
          ) : (
            pendingBookings.map((booking) => (
              <div key={booking.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{booking.property?.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                    </p>
                    <p className="text-sm">{booking.guests} guests</p>
                  </div>
                  <Badge>{booking.status}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onApprove(booking.id)}>
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onReject(booking.id)}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onMessage(booking.id)}>
                    <MessageSquare className="h-4 w-4 mr-1" /> Message
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
