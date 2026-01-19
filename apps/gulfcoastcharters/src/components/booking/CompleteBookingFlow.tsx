import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Users, CreditCard, FileText, CheckCircle } from 'lucide-react';
import TimeSlotSelector from './TimeSlotSelector';
import BookingAddons, { AVAILABLE_ADDONS } from './BookingAddons';

interface CompleteBookingFlowProps {
  charter: any;
  onClose: () => void;
}

export default function CompleteBookingFlow({ charter, onClose }: CompleteBookingFlowProps) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const basePrice = charter.price || 500;
  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const addon = AVAILABLE_ADDONS.find(a => a.id === addonId);
    return sum + (addon?.price || 0);
  }, 0);
  const totalAmount = basePrice + addonsTotal;
  const depositAmount = totalAmount * 0.3;

  const handlePayment = async () => {
    // Simulate Stripe checkout
    toast.loading('Redirecting to secure payment...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Payment successful! Confirmation email sent.');
    setStep(5);
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg mb-3 block">Select Date</Label>
              <Calendar mode="single" selected={date} onSelect={setDate} 
                disabled={(date) => date < new Date()} className="border rounded-lg" />
            </div>
            <div>
              <Label className="text-lg mb-3 block">Select Time</Label>
              <TimeSlotSelector date={date} selectedTime={selectedTime} 
                onTimeSelect={setSelectedTime} charterId={charter.id} />
            </div>
            <div>
              <Label>Number of Guests (Max {charter.capacity || 6})</Label>
              <Input type="number" min="1" max={charter.capacity || 6} value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value))} />
            </div>
            <Button onClick={() => setStep(2)} disabled={!date || !selectedTime} className="w-full">
              Continue to Add-ons
            </Button>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Enhance Your Experience</h3>
            <BookingAddons selectedAddons={selectedAddons} onAddonsChange={setSelectedAddons} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">Continue</Button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Your Information</h3>
            <div className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <Label>Special Requests</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1">Review & Pay</Button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Review & Payment</h3>
            <Card className="p-4 bg-gray-50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Charter:</span><span className="font-semibold">{charter.title}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{date?.toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>Time:</span><span>{selectedTime}</span></div>
                <div className="flex justify-between"><span>Guests:</span><span>{guests}</span></div>
                <Separator />
                <div className="flex justify-between"><span>Base Price:</span><span>${basePrice}</span></div>
                {addonsTotal > 0 && <div className="flex justify-between"><span>Add-ons:</span><span>${addonsTotal}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total:</span><span>${totalAmount}</span></div>
              </div>
            </Card>
            
            <div>
              <Label className="text-lg mb-3 block">Payment Option</Label>
              <RadioGroup value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                <Card className="p-4 cursor-pointer" onClick={() => setPaymentType('full')}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="full" />
                    <div className="flex-1">
                      <div className="font-semibold">Pay in Full</div>
                      <div className="text-sm text-gray-600">${totalAmount} - Save 5%</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 cursor-pointer" onClick={() => setPaymentType('deposit')}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="deposit" />
                    <div className="flex-1">
                      <div className="font-semibold">Pay 30% Deposit</div>
                      <div className="text-sm text-gray-600">${depositAmount.toFixed(2)} now, ${(totalAmount - depositAmount).toFixed(2)} later</div>
                    </div>
                  </div>
                </Card>
              </RadioGroup>
            </div>

            <Card className="p-4 border-yellow-300 bg-yellow-50">
              <h4 className="font-semibold mb-2">Cancellation Policy</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Full refund if cancelled 7+ days before</li>
                <li>• 50% refund if cancelled 3-7 days before</li>
                <li>• No refund if cancelled within 3 days</li>
              </ul>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handlePayment} className="flex-1 bg-green-600 hover:bg-green-700">
                <CreditCard className="w-4 h-4 mr-2" />
                Pay ${paymentType === 'full' ? totalAmount : depositAmount.toFixed(2)}
              </Button>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="text-center space-y-6 py-8">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
            <h3 className="text-2xl font-bold">Booking Confirmed!</h3>
            <p className="text-gray-600">Confirmation email sent to {formData.email}</p>
            <Card className="p-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Booking ID:</span><span className="font-mono">GCC-{Date.now()}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{date?.toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>Time:</span><span>{selectedTime}</span></div>
              </div>
            </Card>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        );
    }
  };

  return (
    <Card className="p-6 max-w-3xl mx-auto max-h-[85vh] overflow-y-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Book {charter.title}</h2>
          {step < 5 && <Badge>Step {step} of 4</Badge>}
        </div>
        {step < 5 && (
          <div className="flex gap-2">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-2 flex-1 rounded ${s <= step ? 'bg-blue-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}
      </div>
      {renderStep()}
    </Card>
  );
}
