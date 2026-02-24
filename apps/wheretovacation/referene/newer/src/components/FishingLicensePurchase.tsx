import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Fish, MapPin, Calendar, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const states = [
  { name: 'Texas', code: 'TX' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Alabama', code: 'AL' },
  { name: 'Florida', code: 'FL' }
];

const licenseTypes = [
  { value: 'saltwater', label: 'Saltwater Fishing' },
  { value: 'freshwater', label: 'Freshwater Fishing' },
  { value: 'allwater', label: 'All Water Fishing' }
];

const durations = [
  { value: 'day', label: '1 Day' },
  { value: '3day', label: '3 Days' },
  { value: '7day', label: '7 Days' },
  { value: 'annual', label: 'Annual' }
];

export default function FishingLicensePurchase({ bookingId }: { bookingId?: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [purchasedLicense, setPurchasedLicense] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    stateCode: 'TX',
    licenseType: 'saltwater',
    residentStatus: 'nonResident',
    duration: 'day',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    zipCode: ''
  });

  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  const handleCalculatePrice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fishing-license-manager', {
        body: {
          action: 'calculate_price',
          stateCode: formData.stateCode,
          licenseType: formData.licenseType,
          residentStatus: formData.residentStatus,
          duration: formData.duration
        }
      });

      if (error) throw error;
      setCalculatedPrice(data.price);
      setStep(2);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('fishing-license-manager', {
        body: {
          action: 'purchase_license',
          userId: user?.id,
          bookingId,
          ...formData,
          price: calculatedPrice,
          address: {
            street: formData.address,
            city: formData.city,
            state: formData.stateCode,
            zipCode: formData.zipCode
          }
        }
      });

      if (error) throw error;

      setPurchasedLicense(data.license);
      setStep(3);

      toast({
        title: 'License Purchased!',
        description: 'Your fishing license has been emailed to you.'
      });
    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Fish className="w-8 h-8" />
          Purchase Fishing License
        </h2>
        <p className="text-muted-foreground">
          Get your state fishing license instantly
        </p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>License Information</CardTitle>
            <CardDescription>Select your license type and duration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={formData.stateCode} onValueChange={(v) => setFormData({...formData, stateCode: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {states.map(s => (
                    <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>License Type</Label>
              <Select value={formData.licenseType} onValueChange={(v) => setFormData({...formData, licenseType: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {licenseTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resident Status</Label>
              <Select value={formData.residentStatus} onValueChange={(v) => setFormData({...formData, residentStatus: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="nonResident">Non-Resident</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={formData.duration} onValueChange={(v) => setFormData({...formData, duration: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durations.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCalculatePrice} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Continue to Personal Information
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Price: ${calculatedPrice?.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Full Name</Label>
                <Input value={formData.guestName} onChange={(e) => setFormData({...formData, guestName: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.guestEmail} onChange={(e) => setFormData({...formData, guestEmail: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.guestPhone} onChange={(e) => setFormData({...formData, guestPhone: e.target.value})} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} />
              </div>
            </div>

            <Button onClick={handlePurchase} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Purchase License - ${calculatedPrice?.toFixed(2)}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && purchasedLicense && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              License Issued Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p><strong>License Number:</strong> {purchasedLicense.licenseNumber}</p>
              <p><strong>State:</strong> {purchasedLicense.stateCode}</p>
              <p><strong>Type:</strong> {purchasedLicense.licenseType}</p>
              <p><strong>Expires:</strong> {new Date(purchasedLicense.expirationDate).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              A copy of your license has been emailed to {purchasedLicense.guestEmail}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
