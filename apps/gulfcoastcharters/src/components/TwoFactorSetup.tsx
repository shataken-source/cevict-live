import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Copy, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState(1);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const startSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'setup' },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      if (error) throw error;
      
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setBackupCodes(data.backupCodes);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'enable', secret, backupCodes, code: verificationCode },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setStep(3);
      toast({ title: '2FA Enabled', description: 'Two-factor authentication is now active' });
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
  };

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Enable Two-Factor Authentication
        </CardTitle>
        <CardDescription>Add an extra layer of security to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app in addition to your password.
            </p>
            <div className="flex gap-2">
              <Button onClick={startSetup} disabled={loading}>
                {loading ? 'Setting up...' : 'Start Setup'}
              </Button>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-sm font-medium">Scan this QR code with your authenticator app:</p>
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto border rounded-lg p-4" />
              <div className="flex items-center gap-2 justify-center">
                <code className="text-xs bg-muted px-2 py-1 rounded">{secret}</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(secret)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Enter verification code:</label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={verifyAndEnable} disabled={loading || verificationCode.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>2FA has been successfully enabled!</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Backup Codes</p>
                <Button size="sm" variant="outline" onClick={downloadBackupCodes}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Save these codes in a safe place. You can use them to access your account if you lose your device.
              </p>
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-xs">{code}</code>
                ))}
              </div>
            </div>

            <Button onClick={onComplete}>Done</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
