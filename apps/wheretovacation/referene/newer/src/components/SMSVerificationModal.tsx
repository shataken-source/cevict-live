import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Phone, MessageSquare } from 'lucide-react';

interface SMSVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onVerified: (phoneNumber: string, smsOptIn: boolean) => void;
}

export default function SMSVerificationModal({
  isOpen,
  onClose,
  userId,
  onVerified
}: SMSVerificationModalProps) {
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handleSendCode = async () => {
    if (phoneNumber.replace(/\D/g, '').length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('sms-verification', {
        body: {
          action: 'send',
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          userId
        }
      });

      if (error) throw error;
      toast.success('Verification code sent via SMS!');
      setStep('verify');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('sms-verification', {
        body: {
          action: 'verify',
          code,
          userId
        }
      });

      if (error) throw error;

      if (data.verified) {
        toast.success('Phone verified successfully!');
        onVerified(phoneNumber.replace(/\D/g, ''), smsOptIn);
        onClose();
      } else {
        toast.error(data.message || 'Invalid verification code');
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {step === 'phone' ? 'Add Phone Number' : 'Verify Phone'}
          </DialogTitle>
          <DialogDescription>
            {step === 'phone' 
              ? 'Enter your phone number to receive SMS booking reminders'
              : `We sent a 6-digit code to ${formatPhoneNumber(phoneNumber)}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'phone' ? (
            <>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formatPhoneNumber(phoneNumber)}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={14}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-opt-in" className="text-base cursor-pointer">
                      SMS Reminders
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive booking reminders via text message
                    </p>
                  </div>
                </div>
                <Switch
                  id="sms-opt-in"
                  checked={smsOptIn}
                  onCheckedChange={setSmsOptIn}
                />
              </div>

              <Button
                onClick={handleSendCode}
                disabled={isSending || phoneNumber.replace(/\D/g, '').length !== 10}
                className="w-full"
              >
                {isSending ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </>
          ) : (
            <>
              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleVerify}
                  disabled={isVerifying || code.length !== 6}
                  className="flex-1"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
                <Button
                  onClick={handleSendCode}
                  disabled={isSending}
                  variant="outline"
                >
                  {isSending ? 'Sending...' : 'Resend'}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Code expires in 10 minutes
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
