import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Fingerprint, Shield, Smartphone, Monitor, Tablet, Key, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import PasskeyRegistration from './PasskeyRegistration';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BiometricDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function BiometricSettings() {
  const { user } = useUser();
  const { toast } = useToast();
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    checkSupport();
    if (user?.id) loadDevices();
  }, [user?.id]);

  const checkSupport = () => {
    const supported = typeof window !== 'undefined' && 
      window.PublicKeyCredential !== undefined;
    setIsSupported(supported);
  };

  const loadDevices = async () => {
    try {
      const { data } = await supabase.functions.invoke('webauthn-manager', {
        body: { action: 'list', userId: user?.id }
      });

      if (data?.success && data.authenticators) {
        const mapped = data.authenticators.map((auth: any) => ({
          id: auth.id,
          deviceName: auth.deviceName || 'Unknown Device',
          deviceType: detectDeviceType(auth),
          lastUsedAt: auth.lastUsedAt || auth.createdAt,
          createdAt: auth.createdAt,
          isCurrent: false
        }));
        setDevices(mapped);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectDeviceType = (auth: any): string => {
    const name = (auth.deviceName || '').toLowerCase();
    if (name.includes('iphone') || name.includes('android') || name.includes('mobile')) return 'mobile';
    if (name.includes('ipad') || name.includes('tablet')) return 'tablet';
    if (name.includes('key') || name.includes('yubikey')) return 'key';
    return 'desktop';
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Remove this biometric device? You can add it again later.')) return;

    try {
      const { data } = await supabase.functions.invoke('webauthn-manager', {
        body: { action: 'delete', credentialId: deviceId }
      });

      if (data?.success) {
        toast({ title: 'Device removed', description: 'Biometric device has been removed' });
        loadDevices();
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-5 h-5" />;
      case 'tablet': return <Tablet className="w-5 h-5" />;
      case 'key': return <Key className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Biometric authentication is not supported on this browser or device.
            Please use a modern browser with WebAuthn support.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devices">My Devices</TabsTrigger>
          <TabsTrigger value="security">Security Info</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Fingerprint className="w-5 h-5" />
                Biometric Devices
              </h3>
              <p className="text-sm text-muted-foreground">
                {devices.length} device{devices.length !== 1 ? 's' : ''} registered
              </p>
            </div>
            <Button onClick={() => setShowAddDevice(!showAddDevice)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </div>

          {showAddDevice && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <PasskeyRegistration
                userId={user?.id || ''}
                onSuccess={() => {
                  setShowAddDevice(false);
                  loadDevices();
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddDevice(false)}
                className="w-full mt-2"
              >
                Cancel
              </Button>
            </div>
          )}

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading devices...</p>
          ) : devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map((device) => (
                <Card key={device.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{device.deviceName}</p>
                          {device.isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(device.createdAt).toLocaleDateString()} • 
                          Last used {new Date(device.lastUsedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(device.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Fingerprint className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No biometric devices registered</p>
              <Button onClick={() => setShowAddDevice(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Device
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Shield className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Passwordless Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Sign in instantly using your fingerprint, Face ID, or security key. No passwords needed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Phishing Protection</h4>
                <p className="text-sm text-muted-foreground">
                  Biometric credentials are bound to this website and cannot be used on fake sites.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Device Security</h4>
                <p className="text-sm text-muted-foreground">
                  Your biometric data never leaves your device. Only secure cryptographic keys are shared.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Shield className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Multi-Device Support</h4>
                <p className="text-sm text-muted-foreground">
                  Register multiple devices and use any of them to sign in securely.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
