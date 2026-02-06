/**
 * Phone Verification Component
 * 
 * Handles phone number verification with SMS codes
 * - Phone number input with validation
 * - Send verification code
 * - Verify code entry
 * - SMS opt-in toggle (requires verified phone)
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Phone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface PhoneVerificationProps {
  userId: string;
  currentPhone?: string;
  phoneVerified?: boolean;
  smsOptIn?: boolean;
  onVerified?: () => void;
  onOptInChange?: (optedIn: boolean) => void;
}

export default function PhoneVerification({
  userId,
  currentPhone = '',
  phoneVerified = false,
  smsOptIn = false,
  onVerified,
  onOptInChange,
}: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState(currentPhone);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify' | 'verified'>(
    phoneVerified ? 'verified' : 'input'
  );
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [optIn, setOptIn] = useState(smsOptIn);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as US number with +1 prefix
    if (digits.length === 0) return '';
    if (digits.length <= 10) {
      return `+1${digits}`;
    }
    return `+${digits}`;
  };

  const validatePhoneNumber = (phone: string) => {
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleSendCode = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid phone number (e.g., +15551234567)');
      return;
    }

    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('sms-verification', {
        body: {
          action: 'send_verification',
          userId,
          phoneNumber,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Verification code sent! Check your phone.');
      setStep('verify');
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      toast.error(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sms-verification', {
        body: {
          action: 'verify_code',
          userId,
          phoneNumber,
          verificationCode,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Phone number verified!');
      setStep('verified');
      if (onVerified) {
        onVerified();
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptInToggle = async (checked: boolean) => {
    if (checked && !phoneVerified) {
      toast.error('Please verify your phone number first');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ sms_opt_in: checked })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setOptIn(checked);
      if (onOptInChange) {
        onOptInChange(checked);
      }
      toast.success(checked ? 'SMS notifications enabled' : 'SMS notifications disabled');
    } catch (error: any) {
      console.error('Error updating SMS opt-in:', error);
      toast.error('Failed to update SMS preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Phone Verification & SMS Reminders
        </CardTitle>
        <CardDescription>
          Verify your phone number to receive SMS booking reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'input' && (
          <>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                placeholder="+15551234567"
                disabled={sendingCode}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your phone number with country code (e.g., +1 for US)
              </p>
            </div>
            <Button
              onClick={handleSendCode}
              disabled={sendingCode || !validatePhoneNumber(phoneNumber)}
              className="w-full"
            >
              {sendingCode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </>
        )}

        {step === 'verify' && (
          <>
            <div>
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code sent to {phoneNumber}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('input');
                  setVerificationCode('');
                }}
                disabled={loading}
              >
                Change Number
              </Button>
            </div>
            <Button
              variant="link"
              onClick={handleSendCode}
              disabled={sendingCode}
              className="w-full text-sm"
            >
              {sendingCode ? 'Sending...' : 'Resend Code'}
            </Button>
          </>
        )}

        {step === 'verified' && (
          <>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Phone Verified</p>
                <p className="text-sm text-green-700">{phoneNumber}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label>SMS Booking Reminders</Label>
                <p className="text-sm text-gray-500">
                  Receive text reminders 24 hours before your booking
                </p>
              </div>
              <Switch
                checked={optIn}
                onCheckedChange={handleOptInToggle}
                disabled={loading}
              />
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setStep('input');
                setPhoneNumber('');
                setVerificationCode('');
              }}
              className="w-full"
            >
              Change Phone Number
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
