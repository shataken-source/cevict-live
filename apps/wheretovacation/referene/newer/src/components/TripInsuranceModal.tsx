import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TripInsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingAmount: number;
  onPurchase: (insuranceType: string, cost: number) => void;
}

export default function TripInsuranceModal({ isOpen, onClose, bookingAmount, onPurchase }: TripInsuranceModalProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const basicCost = Math.round(bookingAmount * 0.05);
  const premiumCost = Math.round(bookingAmount * 0.08);

  const handlePurchase = () => {
    if (!selectedPlan) return;
    const cost = selectedPlan === 'basic' ? basicCost : premiumCost;
    onPurchase(selectedPlan, cost);
    toast({ title: 'Insurance Added', description: 'Trip insurance has been added to your booking.' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Protect Your Trip
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className={`cursor-pointer transition-all ${selectedPlan === 'basic' ? 'ring-2 ring-blue-600' : ''}`} onClick={() => setSelectedPlan('basic')}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">Basic Protection</h3>
                  <p className="text-gray-600">Essential coverage</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">${basicCost}</p>
                  <p className="text-sm text-gray-500">5% of booking</p>
                </div>
              </div>
              <ul className="space-y-2">
                {['Trip cancellation for covered reasons', 'Weather-related cancellations', 'Medical emergencies', 'Up to $5,000 coverage'].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${selectedPlan === 'premium' ? 'ring-2 ring-blue-600' : ''}`} onClick={() => setSelectedPlan('premium')}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">Premium Protection</h3>
                  <p className="text-gray-600">Comprehensive coverage</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">${premiumCost}</p>
                  <p className="text-sm text-gray-500">8% of booking</p>
                </div>
              </div>
              <ul className="space-y-2">
                {['All Basic Protection benefits', 'Cancel for any reason (75% refund)', 'Equipment damage coverage', 'Emergency medical evacuation', 'Up to $15,000 coverage', '24/7 assistance hotline'].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Important Information</p>
              <p>Insurance must be purchased within 24 hours of booking. Review full terms and conditions before purchase.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Skip Insurance</Button>
            <Button onClick={handlePurchase} disabled={!selectedPlan} className="flex-1">Add Insurance</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
