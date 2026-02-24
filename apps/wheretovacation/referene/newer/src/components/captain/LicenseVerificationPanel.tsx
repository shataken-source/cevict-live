import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Search, Loader2, Fish, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function LicenseVerificationPanel({ bookingId }: { bookingId: string }) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!licenseNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a license number',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('fishing-license-manager', {
        body: {
          action: 'verify_license',
          licenseNumber: licenseNumber.trim(),
          captainId: user?.id,
          bookingId
        }
      });

      if (error) throw error;

      setVerificationResult(data);

      if (data.valid) {
        toast({
          title: 'License Verified',
          description: 'This fishing license is valid and active.'
        });
      } else {
        toast({
          title: 'Invalid License',
          description: 'This license number could not be verified.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fish className="w-5 h-5" />
          Verify Guest Fishing License
        </CardTitle>
        <CardDescription>
          Check guest license validity before departure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter license number (e.g., TX-2024-123456)"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
          />
          <Button onClick={handleVerify} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {verificationResult && (
          <div className={`p-4 rounded-lg border-2 ${
            verificationResult.valid 
              ? 'bg-green-50 border-green-500' 
              : 'bg-red-50 border-red-500'
          }`}>
            <div className="flex items-start gap-3">
              {verificationResult.valid ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              )}
              
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold">
                  {verificationResult.valid ? 'Valid License' : 'Invalid License'}
                </h4>
                
                {verificationResult.valid && verificationResult.license && (
                  <div className="space-y-1 text-sm">
                    <p><strong>License #:</strong> {verificationResult.license.licenseNumber}</p>
                    <p><strong>Status:</strong> <Badge variant="outline" className="bg-green-100">Active</Badge></p>
                    <p><strong>Verified:</strong> {new Date(verificationResult.license.verifiedAt).toLocaleString()}</p>
                  </div>
                )}

                {!verificationResult.valid && (
                  <p className="text-sm text-red-700">
                    This license could not be verified. Guest may need to purchase a license.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-900">License Requirements</p>
              <ul className="space-y-1 text-blue-800">
                <li>• All guests 16+ must have valid fishing license</li>
                <li>• Licenses can be purchased at gulfcoastcharters.com</li>
                <li>• Check state-specific exemptions for seniors/children</li>
                <li>• Keep digital or physical copy onboard during trip</li>
              </ul>
            </div>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => window.open('/fishing-licenses', '_blank')}
        >
          Help Guest Purchase License
        </Button>
      </CardContent>
    </Card>
  );
}
