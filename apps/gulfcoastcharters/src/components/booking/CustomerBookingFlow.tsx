import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon, Users, Clock } from 'lucide-react';

interface BookingFlowProps {
  charter: any;
  onClose: () => void;
}

export default function CustomerBookingFlow({ charter, onClose }: BookingFlowProps) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    guests: '',
    duration: '',
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const handleSubmit = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'booking',
          charterId: charter.id,
          date: date?.toISOString(),
          guests: parseInt(formData.guests) || 1,
          duration: formData.duration,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          specialRequests: formData.notes,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: window.location.href,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      toast.error(err.message || 'Booking failed. Please try again.');
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Book {charter.title}</h2>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Select Date</Label>
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </div>
          <div>
            <Label>Number of Guests</Label>
            <Input type="number" value={formData.guests} onChange={(e) => setFormData({ ...formData, guests: e.target.value })} />
          </div>
          <Button onClick={() => setStep(2)} className="w-full">Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <Label>Special Requests</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleSubmit} className="flex-1">Send Booking Request</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
