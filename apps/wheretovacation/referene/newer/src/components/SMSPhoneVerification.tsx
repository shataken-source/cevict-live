import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Loader2, Phone, CheckCircle } from 'lucide-react';

interface SMSPhoneVerificationProps {
  userId: string;
  onVerified: () => void;
}

export default function SMSPhoneVerification({ userId, onVerified }: SMSPhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sendVerificationCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: err } = await supabase.functions.invoke('twilio-sms-service', {
        body: { action: 'send_verification', userId, phoneNumber }
      });

      if (err) throw err;
      if (!data.success) throw new Error(data.error);

      setSuccess('Verification code sent! Check your phone.');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: err } = await supabase.functions.invoke('twilio-sms-service', {
        body: { action: 'verify_code', userId, phoneNumber, verificationCode }
      });

      if (err) throw err;
      if (!data.success) throw new Error(data.error);

      setSuccess('Phone verified successfully!');
      setTimeout(() => onVerified(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {step === 'phone' ? (
        <>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button onClick={sendVerificationCode} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
            Send Verification Code
          </Button>
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>
          <Button onClick={verifyCode} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Verify Phone
          </Button>
          <Button variant="outline" onClick={() => setStep('phone')} disabled={loading} className="w-full">
            Change Number
          </Button>
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}