/**
 * Fishing License Purchase Component
 * 
 * Allows users to purchase fishing licenses for Gulf Coast states
 * - State selection
 * - License type and duration
 * - Personal information form
 * - Stripe payment integration
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface FishingLicensePurchaseProps {
  userId: string;
  bookingId?: string;
  onSuccess?: () => void;
}

const STATES = [
  { code: 'TX', name: 'Texas' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'AL', name: 'Alabama' },
  { code: 'FL', name: 'Florida' },
];

const LICENSE_TYPES = [
  { value: 'saltwater', label: 'Saltwater' },
  { value: 'freshwater', label: 'Freshwater' },
  { value: 'all_water', label: 'All Water' },
];

const DURATIONS = [
  { value: 'day', label: '1 Day' },
  { value: '3day', label: '3 Day' },
  { value: '7day', label: '7 Day' },
  { value: 'annual', label: 'Annual' },
];

export default function FishingLicensePurchase({ userId, bookingId, onSuccess }: FishingLicensePurchaseProps) {
  const [step, setStep] = useState<'select' | 'info' | 'payment'>('select');
  const [loading, setLoading] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [price, setPrice] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    stateCode: '',
    licenseType: '',
    residentStatus: 'nonResident',
    duration: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    dateOfBirth: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
  });

  const handleCalculatePrice = async () => {
    if (!formData.stateCode || !formData.licenseType || !formData.duration) {
      toast.error('Please select state, license type, and duration');
      return;
    }

    setCalculatingPrice(true);
    try {
      const { data, error } = await supabase.functions.invoke('fishing-license-manager', {
        body: {
          action: 'calculate_price',
          stateCode: formData.stateCode,
          licenseType: formData.licenseType,
          residentStatus: formData.residentStatus,
          duration: formData.duration,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPrice(data.price);
      toast.success(`Price: $${data.price}`);
    } catch (error: any) {
      console.error('Error calculating price:', error);
      toast.error(error.message || 'Failed to calculate price');
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handlePurchase = async () => {
    if (!formData.guestName || !formData.guestEmail || !formData.dateOfBirth) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!price) {
      toast.error('Please calculate price first');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fishing-license-manager', {
        body: {
          action: 'purchase_license',
          userId,
          bookingId,
          stateCode: formData.stateCode,
          licenseType: formData.licenseType,
          residentStatus: formData.residentStatus,
          duration: formData.duration,
          guestName: formData.guestName,
          guestEmail: formData.guestEmail,
          guestPhone: formData.guestPhone,
          dateOfBirth: formData.dateOfBirth,
          address: {
            street: formData.addressStreet,
            city: formData.addressCity,
            state: formData.addressState,
            zipCode: formData.addressZip,
          },
          price,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Use existing Stripe checkout flow for payment
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'custom_email',
          amount: price,
          email: formData.guestEmail,
          customerName: formData.guestName,
          successUrl: `${window.location.origin}/payment-success?license_id=${data.license.id}`,
          cancelUrl: window.location.href,
          metadata: {
            license_id: data.license.id,
            license_number: data.license.licenseNumber,
            state_code: formData.stateCode,
            license_type: formData.licenseType,
            user_id: userId,
            booking_id: bookingId || '',
          },
        },
      });

      if (checkoutError) throw checkoutError;
      if (checkoutData?.error) throw new Error(checkoutData.error);

      // Redirect to Stripe Checkout
      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      } else {
        toast.success('License purchase initiated! Complete payment to receive your license.');
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Error purchasing license:', error);
      toast.error(error.message || 'Failed to purchase license');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Purchase Fishing License
        </CardTitle>
        <CardDescription>
          Buy a fishing license for your charter trip
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'select' && (
          <>
            <div>
              <Label htmlFor="state">State</Label>
              <Select
                value={formData.stateCode}
                onValueChange={(value) => setFormData({ ...formData, stateCode: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="licenseType">License Type</Label>
              <Select
                value={formData.licenseType}
                onValueChange={(value) => setFormData({ ...formData, licenseType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select license type" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="residentStatus">Resident Status</Label>
              <Select
                value={formData.residentStatus}
                onValueChange={(value) => setFormData({ ...formData, residentStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="nonResident">Non-Resident</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={formData.duration}
                onValueChange={(value) => setFormData({ ...formData, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((dur) => (
                    <SelectItem key={dur.value} value={dur.value}>
                      {dur.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCalculatePrice}
                disabled={calculatingPrice || !formData.stateCode || !formData.licenseType || !formData.duration}
                className="flex-1"
              >
                {calculatingPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Calculate Price'
                )}
              </Button>
              {price && (
                <Button onClick={() => setStep('info')} className="flex-1">
                  Continue (${price})
                </Button>
              )}
            </div>
          </>
        )}

        {step === 'info' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guestName">Full Name *</Label>
                <Input
                  id="guestName"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="guestEmail">Email *</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={formData.guestEmail}
                  onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guestPhone">Phone</Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="addressStreet">Street Address</Label>
              <Input
                id="addressStreet"
                value={formData.addressStreet}
                onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="addressCity">City</Label>
                <Input
                  id="addressCity"
                  value={formData.addressCity}
                  onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="addressState">State</Label>
                <Input
                  id="addressState"
                  value={formData.addressState}
                  onChange={(e) => setFormData({ ...formData, addressState: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="addressZip">ZIP</Label>
                <Input
                  id="addressZip"
                  value={formData.addressZip}
                  onChange={(e) => setFormData({ ...formData, addressZip: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Back
              </Button>
              <Button onClick={handlePurchase} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase (${price})
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
