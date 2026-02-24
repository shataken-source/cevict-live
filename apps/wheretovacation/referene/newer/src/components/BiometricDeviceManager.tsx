import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Tablet, Key, Trash2, Plus, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import PasskeyRegistration from './PasskeyRegistration';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BiometricDevice {
  id: string;
  device_name: string;
  device_type: string;
  last_used: string;
  created_at: string;
  is_current: boolean;
}

export default function BiometricDeviceManager({ userId }: { userId: string }) {
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deleteDevice, setDeleteDevice] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDevices();
  }, [userId]);

  const loadDevices = async () => {
    try {
      const { data } = await supabase.functions.invoke('biometric-manager', {
        body: { action: 'list-devices', userId }
      });

      if (data?.success) {
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceId: string) => {
    try {
      const { data } = await supabase.functions.invoke('biometric-manager', {
        body: { action: 'delete-device', userId, deviceId }
      });

      if (data?.success) {
        toast({ title: 'Device removed', description: 'Biometric device has been removed' });
        loadDevices();
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setDeleteDevice(null);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-5 h-5" />;
      case 'tablet': return <Tablet className="w-5 h-5" />;
      case 'desktop': return <Monitor className="w-5 h-5" />;
      default: return <Key className="w-5 h-5" />;
    }
  };

  if (loading) return <Card className="p-6"><p>Loading devices...</p></Card>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Biometric Devices
          </h3>
          <p className="text-sm text-muted-foreground">Manage your registered biometric devices</p>
        </div>
        <Button onClick={() => setShowAddDevice(!showAddDevice)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>

      {showAddDevice && (
        <PasskeyRegistration userId={userId} onSuccess={() => { setShowAddDevice(false); loadDevices(); }} />
      )}

      <div className="space-y-3">
        {devices.map((device) => (
          <Card key={device.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {getDeviceIcon(device.device_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{device.device_name}</p>
                    {device.is_current && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last used: {new Date(device.last_used).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDeleteDevice(device.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}

        {devices.length === 0 && !showAddDevice && (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No biometric devices registered</p>
            <Button onClick={() => setShowAddDevice(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Device
            </Button>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteDevice} onOpenChange={() => setDeleteDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove biometric authentication for this device. You can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDevice && handleDelete(deleteDevice)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
