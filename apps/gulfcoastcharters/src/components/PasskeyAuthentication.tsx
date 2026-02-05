import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fingerprint, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PasskeyAuthenticationProps {
  onSuccess: (userId: string) => void;
  onCancel?: () => void;
}

export default function PasskeyAuthentication({ onSuccess, onCancel }: PasskeyAuthenticationProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  const authenticateWithPasskey = async () => {
    setIsAuthenticating(true);

    try {
      // Get challenge from server
      const { data: challengeData } = await supabase.functions.invoke('webauthn-manager', {
        body: { action: 'generate-challenge' }
      });

      if (!challengeData?.success) {
        throw new Error('Failed to generate challenge');
      }

      // Convert challenge to Uint8Array
      const challenge = Uint8Array.from(atob(challengeData.challenge), c => c.charCodeAt(0));

      // Get credential options
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
        rpId: window.location.hostname
      };

      // Get credential
      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Authentication cancelled');
      }

      // Verify with server
      const { data: authData } = await supabase.functions.invoke('webauthn-manager', {
        body: {
          action: 'authenticate',
          credentialId: credential.id,
          credentialData: {
            authenticatorData: btoa(String.fromCharCode(...new Uint8Array(
              (credential.response as any).authenticatorData
            ))),
            clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(
              credential.response.clientDataJSON
            ))),
            signature: btoa(String.fromCharCode(...new Uint8Array(
              (credential.response as any).signature
            )))
          }
        }
      });

      if (authData?.success && authData?.verified) {
        toast({
          title: 'Authentication successful',
          description: 'Welcome back!'
        });
        onSuccess(authData.userId || 'user-id');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Authentication cancelled',
          description: 'Please try again',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Authentication failed',
          description: error.message || 'Failed to authenticate with passkey',
          variant: 'destructive'
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {isAuthenticating ? (
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          ) : (
            <Fingerprint className="w-16 h-16 text-primary" />
          )}
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">
            {isAuthenticating ? 'Authenticating...' : 'Sign in with Passkey'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isAuthenticating 
              ? 'Follow the prompt on your device'
              : 'Use your fingerprint, face, or security key'
            }
          </p>
        </div>

        {!isAuthenticating && (
          <div className="space-y-2">
            <Button 
              onClick={authenticateWithPasskey}
              className="w-full"
              size="lg"
            >
              <Fingerprint className="w-5 h-5 mr-2" />
              Authenticate
            </Button>

            {onCancel && (
              <Button 
                onClick={onCancel}
                variant="ghost"
                className="w-full"
              >
                Use password instead
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
