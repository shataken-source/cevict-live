import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Share2, Bell, Home } from 'lucide-react';

export default function PWAFeatures() {
  const [canShare, setCanShare] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setCanShare('share' in navigator);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  const handleShare = async () => {
    if (!canShare) return;
    
    try {
      await navigator.share({
        title: 'Gulf Coast Charters',
        text: 'Book amazing yacht and fishing charters!',
        url: window.location.href
      });
    } catch (error) {
      console.log('Share cancelled');
    }
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification('Notifications enabled!', {
        body: 'You\'ll receive updates about your bookings',
        icon: '/placeholder.svg'
      });
    }
  };

  const addToHomeScreen = () => {
    alert('To add to home screen:\n\niOS: Tap Share → Add to Home Screen\nAndroid: Tap Menu → Install App');
  };

  if (!isStandalone) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2">
      {canShare && (
        <Button
          onClick={handleShare}
          size="icon"
          className="rounded-full shadow-lg"
          title="Share app"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      )}
      
      {Notification.permission === 'default' && (
        <Button
          onClick={requestNotifications}
          size="icon"
          className="rounded-full shadow-lg"
          title="Enable notifications"
        >
          <Bell className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
