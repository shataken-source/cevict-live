import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { supabase } from '@/lib/supabase';
import { awardLoyaltyPoints, hasActiveDiscount } from '@/utils/loyaltyRewards';
import CustomerBookingCalendar from './CustomerBookingCalendar';
import ComprehensiveWeatherDisplay from './ComprehensiveWeatherDisplay';
import { toast } from 'sonner';





interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  charter: any;
  /** Prefill from live calendar (Check availability & book) */
  initialDate?: string;
  initialTimeSlot?: string;
}

export default function BookingModal({ isOpen, onClose, charter, initialDate, initialTimeSlot }: BookingModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    guests: 2,
    duration: 'Half Day',
    requests: '',
    emailReminder: true,
    smsReminder: false,
    referralCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);

  // Prefill date and duration when opened from live calendar
  useEffect(() => {
    if (isOpen && initialDate) {
      setFormData((prev) => ({ ...prev, date: initialDate }));
      setSelectedDate(new Date(initialDate + 'T12:00:00'));
      if (initialTimeSlot === 'full_day') {
        setFormData((prev) => ({ ...prev, duration: 'Full Day' }));
      } else if (initialTimeSlot === 'morning' || initialTimeSlot === 'afternoon') {
        setFormData((prev) => ({ ...prev, duration: 'Half Day' }));
      }
    }
  }, [isOpen, initialDate, initialTimeSlot]);

  const price = formData.duration === 'Half Day' ? charter.priceHalfDay : charter.priceFullDay;
  const finalPrice = Math.max(0, price - referralDiscount);

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralDiscount(0);
      return;
    }

    try {
      const { data } = await supabase.functions.invoke('referral-system', {
        body: { 
          action: 'validate_code', 
          referralCode: code,
          userEmail: formData.email
        }
      });

      if (data?.isValid) {
        setReferralDiscount(data.discount);
        toast.success(`Referral code applied! You get $${data.discount} off.`);
      } else {
        setReferralDiscount(0);
        toast.error('Invalid referral code');
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;

    const captainId = charter.captain_id ?? charter.captainId ?? charter.id;
    const dateStr = date.toISOString().split('T')[0];

    try {
      const res = await fetch(
        `/api/calendar/availability?captainId=${encodeURIComponent(captainId)}&startDate=${dateStr}&endDate=${dateStr}`
      );
      if (!res.ok) throw new Error('Availability check failed');
      const data = await res.json();
      const slots = data.availability || [];
      const hasAvailable = slots.some((s: any) => s.status === 'available');
      if (slots.length > 0 && !hasAvailable) {
        toast.error('This date is no longer available. Please select another date.');
        return;
      }
    } catch {
      toast.error('Could not check availability. Please try again.');
      return;
    }

    setSelectedDate(date);
    setFormData({ ...formData, date: dateStr });
    setShowCalendar(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Final availability check before booking
      const captainId = charter.captain_id ?? charter.captainId ?? charter.id;
      try {
        const availRes = await fetch(
          `/api/calendar/availability?captainId=${encodeURIComponent(captainId)}&startDate=${formData.date}&endDate=${formData.date}`
        );
        if (availRes.ok) {
          const availData = await availRes.json();
          const slots = availData.availability || [];
          const hasAvailable = slots.some((s: any) => s.status === 'available');
          if (slots.length > 0 && !hasAvailable) {
            toast.error('This date was just booked by someone else. Please select another date.');
            setLoading(false);
            return;
          }
        }
      } catch {
        // Proceed; availability check is best-effort
      }

      // Store booking details for success page including email info
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        charterName: charter.businessName,
        boatType: charter.boatType,
        date: formData.date,
        time: '9:00 AM', // Default time, can be made dynamic
        location: charter.location,
        duration: formData.duration,
        price,
        customerName: formData.name,
        customerEmail: formData.email,
        captainName: charter.captainName || 'Your Captain'
      }));


      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          charterId: charter.id,
          charterName: charter.businessName,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          bookingDate: formData.date,
          duration: formData.duration,
          guests: formData.guests,
          specialRequests: formData.requests,
          price: finalPrice,
          originalPrice: price,
          referralCode: formData.referralCode,
          referralDiscount,
          emailReminder: formData.emailReminder,
          smsReminder: formData.smsReminder,
          captainName: charter.captainName,
          captainPhone: charter.phone,
          captainEmail: charter.email,
          location: charter.location,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: window.location.href
        }
      });


      if (error) throw error;

      // Send instant booking confirmation
      if (data.bookingId) {
        await supabase.functions.invoke('instant-booking-confirmation', {
          body: {
            bookingId: data.bookingId,
            captainId: charter.captainId || charter.id,
            customerId: data.customerId,
            customerEmail: formData.email,
            customerPhone: formData.phone,
            bookingDetails: {
              charterName: charter.businessName,
              date: formData.date,
              captainName: charter.captainName || 'Your Captain',
              price: finalPrice
            }
          }
        });
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }

    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };




  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-t-4 border-t-blue-600">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-white text-xl">Book Your Gulf Coast Fishing Adventure</DialogTitle>
          <p className="text-blue-100 text-sm">{charter.businessName} - Reserve your spot today</p>
        </DialogHeader>


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <Label>Booking Date</Label>
            <Button 
              type="button"
              variant="outline" 
              className="w-full justify-start text-left font-normal"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              {selectedDate ? selectedDate.toLocaleDateString() : 'Select a date'}
            </Button>
            {showCalendar && (
              <div className="mt-2">
                <CustomerBookingCalendar
                  captainId={charter.captain_id ?? charter.captainId ?? charter.id}
                  onDateSelect={handleDateSelect}
                  selectedDate={selectedDate}
                />
              </div>
            )}
          </div>


          <div>
            <Label htmlFor="guests">Number of Guests</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              max="20"
              required
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div>
            <Label htmlFor="duration">Duration</Label>
            <select
              id="duration"
              className="w-full p-2 border rounded"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            >
              <option value="Half Day">Half Day (4 hours) - ${charter.priceHalfDay}</option>
              <option value="Full Day">Full Day (8 hours) - ${charter.priceFullDay}</option>
            </select>
          </div>


          <div>
            <Label htmlFor="requests">Special Requests</Label>
            <textarea
              id="requests"
              className="w-full p-2 border rounded"
              rows={3}
              value={formData.requests}
              onChange={(e) => setFormData({ ...formData, requests: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="referralCode">Referral Code (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="referralCode"
                placeholder="Enter referral code"
                value={formData.referralCode}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => validateReferralCode(formData.referralCode)}
              >
                Apply
              </Button>
            </div>
            {referralDiscount > 0 && (
              <p className="text-sm text-green-600 mt-1">$10 discount applied!</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Get $10 off your first booking!</p>
          </div>


          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Reminder Preferences</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emailReminder"
                checked={formData.emailReminder}
                onCheckedChange={(checked: boolean) => 
                  setFormData({ ...formData, emailReminder: checked as boolean })
                }
              />
              <label htmlFor="emailReminder" className="text-sm cursor-pointer">
                Send email reminder 24 hours before charter
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="smsReminder"
                checked={formData.smsReminder}
                onCheckedChange={(checked: boolean) => 
                  setFormData({ ...formData, smsReminder: checked as boolean })
                }
              />
              <label htmlFor="smsReminder" className="text-sm cursor-pointer">
                Send SMS reminder (includes weather forecast)
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Reminders include weather forecast, captain contact info, and what to bring checklist
            </p>
          </div>


          <div className="bg-blue-50 p-4 rounded space-y-2">
            {referralDiscount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${price}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Referral Discount:</span>
                  <span>-${referralDiscount}</span>
                </div>
                <div className="border-t pt-2" />
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold text-blue-900">${finalPrice}</span>
            </div>
          </div>


          <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold" disabled={loading}>
            {loading ? 'Processing...' : 'Proceed to Secure Payment'}
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  );
}
