/**
 * Rain Check Issuance Component
 * Allows captains to issue rain checks for cancelled bookings
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CloudRain } from 'lucide-react';

interface RainCheckIssuanceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  booking: any;
  onSuccess?: () => void;
}

export default function RainCheckIssuance({
  open,
  onOpenChange,
  bookingId,
  booking,
  onSuccess
}: RainCheckIssuanceProps) {
  const [loading, setLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [captainMessage, setCaptainMessage] = useState('');
  const [value, setValue] = useState(booking?.total_price || booking?.price || '0');
  const [expirationMonths, setExpirationMonths] = useState('12');

  const handleIssue = async () => {
    if (!cancellationReason) {
      toast.error('Please select a cancellation reason');
      return;
    }

    if (!value || parseFloat(value) <= 0) {
      toast.error('Please enter a valid rain check value');
      return;
    }

    setLoading(true);

    try {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + parseInt(expirationMonths));

      const response = await fetch('/api/rain-checks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          cancellationReason,
          captainMessage,
          value: parseFloat(value),
          expirationDate: expirationDate.toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to issue rain check');
      }

      toast.success('Rain check issued successfully!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to issue rain check');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudRain className="w-5 h-5" />
            Issue Rain Check
          </DialogTitle>
          <DialogDescription>
            Create a rain check for this cancelled booking that the customer can use for a future trip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Select value={cancellationReason} onValueChange={setCancellationReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weather">Weather (unsafe conditions)</SelectItem>
                <SelectItem value="mechanical">Mechanical Issues</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="uscg">USCG Restrictions</SelectItem>
                <SelectItem value="customer_request">Customer Request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="value">Rain Check Value ($) *</Label>
            <Input
              id="value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          <div>
            <Label htmlFor="expiration">Expiration (months from now)</Label>
            <Select value={expirationMonths} onValueChange={setExpirationMonths}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="18">18 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Personal Message to Customer (Optional)</Label>
            <Textarea
              id="message"
              value={captainMessage}
              onChange={(e) => setCaptainMessage(e.target.value)}
              placeholder="Add a personal message..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssue} disabled={loading}>
              {loading ? 'Issuing...' : 'Issue Rain Check'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
