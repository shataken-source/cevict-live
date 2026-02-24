import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, MapPin, Phone, MessageSquare, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import QuickActionPanel from './QuickActionPanel';
import GPSCheckIn from './GPSCheckIn';

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  charter_name: string;
  date: string;
  time: string;
  status: string;
  price: number;
  location?: { lat: number; lng: number };
  notes?: string;
}

export default function MobileBookingManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'today'>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true });

      if (!error && data) {
        setBookings(data);
      }
    } catch (err) {
      toast({ title: 'Error loading bookings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'today') return b.date === new Date().toISOString().split('T')[0];
    return b.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'confirmed', 'today'].map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f as any)}
            className="capitalize"
          >
            {f} ({bookings.filter(b => f === 'all' || (f === 'today' ? b.date === new Date().toISOString().split('T')[0] : b.status === f)).length})
          </Button>
        ))}
      </div>

      {filteredBookings.map(booking => (
        <BookingCard key={booking.id} booking={booking} onUpdate={loadBookings} />
      ))}
    </div>
  );
}

function BookingCard({ booking, onUpdate }: { booking: Booking; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold">{booking.customer_name}</h3>
          <p className="text-sm text-gray-600">{booking.charter_name}</p>
        </div>
        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
          {booking.status}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          {booking.date} at {booking.time}
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          ${booking.price}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <Button size="sm" variant="outline" className="w-full">
            <Phone className="w-4 h-4 mr-2" />
            Call {booking.customer_phone}
          </Button>
          <Button size="sm" variant="outline" className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Customer
          </Button>
        </div>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="w-full mt-3"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show Less' : 'Show More'}
      </Button>

      {booking.status === 'pending' && <QuickActionPanel bookingId={booking.id} onSuccess={onUpdate} />}
      {booking.status === 'confirmed' && <GPSCheckIn bookingId={booking.id} expectedLocation={booking.location} />}
    </Card>
  );
}
