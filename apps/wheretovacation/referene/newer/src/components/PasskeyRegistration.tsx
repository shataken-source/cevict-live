import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Fingerprint, Shield, Smartphone, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PasskeyRegistrationProps {
  userId: string;
  onSuccess?: () => void;
}

export default function PasskeyRegistration({ userId, onSuccess }: PasskeyRegistrationProps) {
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  // Check if WebAuthn is supported
  const isWebAuthnSupported = typeof window !== 'undefined' && 
    window.PublicKeyCredential !== undefined;

  const registerPasskey = async () => {
    if (!deviceName.trim()) {
      toast({
        title: 'Device name required',
        description: 'Please enter a name for this device',
        variant: 'destructive'
      });
      return;
    }

    setIsRegistering(true);

    try {
      // Get challenge from server
      const { data: challengeData } = await supabase.functions.invoke('webauthn-manager', {
        body: { action: 'generate-challenge', userId }
      });

      if (!challengeData?.success) {
        throw new Error('Failed to generate challenge');
      }

      // Convert challenge to Uint8Array
      const challenge = Uint8Array.from(atob(challengeData.challenge), c => c.charCodeAt(0));

      // Create credential options
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'CharterConnect',
          id: window.location.hostname
        },
        user: {
          id: Uint8Array.from(userId, c => c.charCodeAt(0)),
          name: userId,
          displayName: deviceName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          userVerification: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      };

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Register with server
      const { data: registerData } = await supabase.functions.invoke('webauthn-manager', {
        body: {
          action: 'register',
          userId,
          deviceName,
          credentialData: {
            credentialId: credential.id,
            publicKey: btoa(String.fromCharCode(...new Uint8Array(
              (credential.response as any).getPublicKey()
            ))),
            authenticatorAttachment: (credential as any).authenticatorAttachment,
            transports: (credential.response as any).getTransports?.() || []
          }
        }
      });

      if (registerData?.success) {
        toast({
          title: 'Passkey registered',
          description: 'You can now use biometric authentication to sign in'
        });
        setDeviceName('');
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Passkey registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'Failed to register passkey',
        variant: 'destructive'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isWebAuthnSupported) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Biometric authentication is not supported on this device</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Fingerprint className="w-8 h-8 text-primary" />
          <div>
            <h3 className="font-semibold">Add Passkey</h3>
            <p className="text-sm text-muted-foreground">
              Use fingerprint, Face ID, or security key
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deviceName">Device Name</Label>
          <Input
            id="deviceName"
            placeholder="e.g., iPhone 15 Pro, MacBook Pro"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
          />
        </div>

        <Button 
          onClick={registerPasskey} 
          disabled={isRegistering || !deviceName.trim()}
          className="w-full"
        >
          {isRegistering ? 'Registering...' : 'Register Passkey'}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Works with Touch ID, Face ID, Windows Hello
          </p>
          <p className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Compatible with hardware security keys
          </p>
        </div>
      </div>
    </Card>
  );
}
