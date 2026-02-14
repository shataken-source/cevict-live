import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Calendar, Clock } from 'lucide-react';
import { useUser } from '@/hooks/useStoreCompat';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface RentalBookingModalProps {
  rental: any;
  onClose: () => void;
}

export default function RentalBookingModal({ rental, onClose }: RentalBookingModalProps) {
  const { user, isAuthenticated } = useUser();
  const { toast } = useToast();
  const [duration, setDuration] = useState<'hourly' | 'halfDay' | 'fullDay'>('fullDay');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);

  const prices = {
    hourly: rental.priceHourly,
    halfDay: rental.priceHalfDay,
    fullDay: rental.priceFullDay,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({ title: 'Please login to book', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${date}T${time}`);
      const hours = duration === 'hourly' ? 1 : duration === 'halfDay' ? 4 : 8;
      const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);

      const { data, error } = await supabase.functions.invoke('rental-booking-system', {
        body: {
          action: 'create_booking',
          boatId: rental.id,
          userId: user?.id,
          customerName: user?.email || 'Guest',
          customerEmail: user?.email || '',
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          totalPrice: prices[duration]
        }
      });

      if (error) throw error;

      toast({ title: 'Booking Confirmed!', description: 'Check your email for details' });
      onClose();
    } catch (error: any) {
      toast({ title: 'Booking failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={rental.image} alt={rental.name} className="w-full h-64 object-cover rounded-t-2xl" />
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8">
          <h2 className="text-3xl font-bold mb-2">{rental.name}</h2>
          <p className="text-gray-600 mb-4">{rental.location}</p>
          <p className="text-gray-700 mb-6">{rental.description}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Rental Duration</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  type="button"
                  variant={duration === 'hourly' ? 'default' : 'outline'}
                  onClick={() => setDuration('hourly')}
                  className="flex flex-col h-auto py-3"
                >
                  <Clock className="w-5 h-5 mb-1" />
                  <span className="text-xs">Hourly</span>
                  <span className="font-bold">${rental.priceHourly}</span>
                </Button>
                <Button
                  type="button"
                  variant={duration === 'halfDay' ? 'default' : 'outline'}
                  onClick={() => setDuration('halfDay')}
                  className="flex flex-col h-auto py-3"
                >
                  <Clock className="w-5 h-5 mb-1" />
                  <span className="text-xs">Half Day</span>
                  <span className="font-bold">${rental.priceHalfDay}</span>
                </Button>
                <Button
                  type="button"
                  variant={duration === 'fullDay' ? 'default' : 'outline'}
                  onClick={() => setDuration('fullDay')}
                  className="flex flex-col h-auto py-3"
                >
                  <Calendar className="w-5 h-5 mb-1" />
                  <span className="text-xs">Full Day</span>
                  <span className="font-bold">${rental.priceFullDay}</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="time">Start Time</Label>
                <Input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            </div>

            <div>
              <Label htmlFor="guests">Number of Guests (Max: {rental.capacity})</Label>
              <Input 
                type="number" 
                id="guests" 
                min="1" 
                max={rental.capacity} 
                value={guests} 
                onChange={(e) => setGuests(parseInt(e.target.value))} 
                required 
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Included Features:</h3>
              <ul className="space-y-1">
                {rental.features.map((feature: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-700">✓ {feature}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600">
                {loading ? 'Processing...' : `Book Now - $${prices[duration]}`}
              </Button>

              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
