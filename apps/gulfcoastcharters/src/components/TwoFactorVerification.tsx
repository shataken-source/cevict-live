import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

export default function TwoFactorVerification({ onVerified, onCancel }: TwoFactorVerificationProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { 
          action: 'verify',
          code: useBackupCode ? undefined : code,
          backupCode: useBackupCode ? code : undefined
        },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      if (error) throw error;
      if (!data.valid) {
        throw new Error('Invalid code');
      }
      
      toast({ title: 'Verified', description: 'Authentication successful' });
      onVerified();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          {useBackupCode 
            ? 'Enter one of your backup codes' 
            : 'Enter the code from your authenticator app'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={useBackupCode ? 'Backup code' : '000000'}
            maxLength={useBackupCode ? 10 : 6}
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleVerify} disabled={loading || !code} className="flex-1">
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>

        <Button
          variant="link"
          size="sm"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode('');
            setError('');
          }}
          className="w-full"
        >
          {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
        </Button>
      </CardContent>
    </Card>
  );
}
