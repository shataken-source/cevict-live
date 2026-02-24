import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface BookingFormProps {
  boatId: string;
  boatName: string;
  pricePerDay: number;
}

export default function RealTimeBookingSystem({ boatId, boatName, pricePerDay }: BookingFormProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  const calculateTotal = () => {
    if (!startDate || !endDate) return 0;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return days * pricePerDay;
  };

  const checkAvailability = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Please select dates', variant: 'destructive' });
      return;
    }

    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('rental-booking-system', {
        body: {
          action: 'check_availability',
          boatId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      if (error) throw error;
      setAvailable(data.available);
      
      toast({
        title: data.available ? 'Available!' : 'Not Available',
        description: data.available ? 'This boat is available for your dates' : 'Please select different dates',
        variant: data.available ? 'default' : 'destructive'
      });
    } catch (error: any) {
      toast({ title: 'Error checking availability', description: error.message, variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !customerName || !customerEmail) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rental-booking-system', {
        body: {
          action: 'create_booking',
          boatId,
          customerName,
          customerEmail,
          customerPhone,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalPrice: calculateTotal()
        }
      });

      if (error) throw error;

      toast({
        title: 'Booking Confirmed!',
        description: 'Check your email for confirmation details'
      });

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setAvailable(null);
    } catch (error: any) {
      toast({ title: 'Booking failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book {boatName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBooking} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => date < new Date()} />
            </div>
            <div>
              <Label>End Date</Label>
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => !startDate || date <= startDate} />
            </div>
          </div>

          <Button type="button" onClick={checkAvailability} disabled={checking} className="w-full">
            {checking ? 'Checking...' : 'Check Availability'}
          </Button>

          {available !== null && (
            <div className={`p-3 rounded ${available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {available ? '✓ Available for booking' : '✗ Not available'}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          {startDate && endDate && (
            <div className="bg-blue-50 p-4 rounded">
              <p className="font-semibold">Total: ${calculateTotal()}</p>
              <p className="text-sm text-gray-600">
                {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days × ${pricePerDay}/day
              </p>
            </div>
          )}

          <Button type="submit" disabled={loading || !available} className="w-full">
            {loading ? 'Processing...' : 'Confirm Booking'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
