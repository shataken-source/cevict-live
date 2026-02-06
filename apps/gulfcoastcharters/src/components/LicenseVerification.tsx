/**
 * License Verification Component
 * 
 * Allows captains to verify guest fishing licenses
 * - Enter license number
 * - Verify validity
 * - Record verification
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface LicenseVerificationProps {
  captainId: string;
  bookingId?: string;
  onVerified?: () => void;
}

export default function LicenseVerification({ captainId, bookingId, onVerified }: LicenseVerificationProps) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    license?: any;
    error?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!licenseNumber.trim()) {
      toast.error('Please enter a license number');
      return;
    }

    // Validate format: XX-YYYY-NNNNNN
    const licenseRegex = /^[A-Z]{2}-\d{4}-\d{6}$/;
    if (!licenseRegex.test(licenseNumber.trim())) {
      toast.error('Invalid format. Expected: XX-YYYY-NNNNNN (e.g., TX-2024-123456)');
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('fishing-license-manager', {
        body: {
          action: 'verify_license',
          licenseNumber: licenseNumber.trim().toUpperCase(),
          captainId,
          bookingId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setVerificationResult(data);
      
      if (data.valid) {
        toast.success('License verified successfully!');
        if (onVerified) {
          onVerified();
        }
      } else {
        toast.error('License is invalid or expired');
      }
    } catch (error: any) {
      console.error('Error verifying license:', error);
      toast.error(error.message || 'Failed to verify license');
      setVerificationResult({ valid: false, error: error.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Verify Fishing License
        </CardTitle>
        <CardDescription>
          Enter license number to verify validity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="licenseNumber">License Number</Label>
          <Input
            id="licenseNumber"
            value={licenseNumber}
            onChange={(e) => {
              setLicenseNumber(e.target.value.toUpperCase());
              setVerificationResult(null);
            }}
            placeholder="TX-2024-123456"
            disabled={verifying}
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: XX-YYYY-NNNNNN (e.g., TX-2024-123456)
          </p>
        </div>

        <Button
          onClick={handleVerify}
          disabled={verifying || !licenseNumber.trim()}
          className="w-full"
        >
          {verifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify License
            </>
          )}
        </Button>

        {verificationResult && (
          <div className={`p-4 rounded-md border-2 ${
            verificationResult.valid
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-2">
              {verificationResult.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${
                  verificationResult.valid ? 'text-green-900' : 'text-red-900'
                }`}>
                  {verificationResult.valid ? 'License Valid' : 'License Invalid'}
                </p>
                {verificationResult.license && (
                  <div className="text-sm mt-2 space-y-1">
                    <p>License: {verificationResult.license.licenseNumber}</p>
                    <p>Status: {verificationResult.license.status}</p>
                    <p>Expiration: {new Date(verificationResult.license.expirationDate).toLocaleDateString()}</p>
                    {verificationResult.license.isExpired && (
                      <p className="text-red-600 font-semibold">⚠️ This license has expired</p>
                    )}
                  </div>
                )}
                {verificationResult.error && (
                  <p className="text-sm text-red-600 mt-1">{verificationResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
