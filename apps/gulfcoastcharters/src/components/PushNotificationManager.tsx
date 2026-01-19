import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription
} from '@/utils/pushNotifications';

export function PushNotificationManager() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPushStatus();
  }, []);

  async function checkPushStatus() {
    const supported = await isPushSupported();
    setIsSupported(supported);

    if (supported) {
      const perm = await getPushPermission();
      setPermission(perm);

      const subscription = await getCurrentSubscription();
      setIsSubscribed(!!subscription);
    }
  }

  async function handleSubscribe() {
    if (!user) return;

    setLoading(true);
    try {
      const subscription = await subscribeToPush(user.id);
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
        toast({
          title: 'Push notifications enabled',
          description: 'You will receive push notifications for important updates.'
        });
      }
    } catch (error) {
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Could not enable push notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    if (!user) return;

    setLoading(true);
    try {
      await unsubscribeFromPush(user.id);
      setIsSubscribed(false);
      toast({
        title: 'Push notifications disabled',
        description: 'You will no longer receive push notifications.'
      });
    } catch (error) {
      toast({
        title: 'Unsubscribe failed',
        description: 'Could not disable push notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isSupported) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Push notifications are not supported in your browser.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          Browser Push Notifications
        </CardTitle>
        <CardDescription>
          Receive instant notifications even when the site is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are blocked. Please enable them in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              Status: {isSubscribed ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed 
                ? 'You are receiving push notifications' 
                : 'Enable to receive instant alerts'}
            </p>
          </div>
          
          {isSubscribed ? (
            <Button
              variant="outline"
              onClick={handleUnsubscribe}
              disabled={loading}
            >
              Disable
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={loading || permission === 'denied'}
            >
              Enable
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
