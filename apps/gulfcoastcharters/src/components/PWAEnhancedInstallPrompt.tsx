import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Smartphone, Zap, Wifi, Bell } from 'lucide-react';

export default function PWAEnhancedInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // PWA mode: standalone or iOS standalone
    const isPWA = () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
    if (isPWA()) {
      document.body.classList.add('pwa-mode');
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const views = parseInt(localStorage.getItem('page_views') || '0');
      const dismissed = localStorage.getItem('pwa_dismissed');
      if (views >= 3 && !dismissed) {
        setTimeout(() => setShowPrompt(true), 30000);
      }
    };

    const installed = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      document.body.classList.add('pwa-mode');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    const views = parseInt(localStorage.getItem('page_views') || '0');
    localStorage.setItem('page_views', (views + 1).toString());

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 animate-slide-up">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">Install Gulf Coast Charters</h3>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-gray-600 mb-6">
          Get the full app experience with offline access and instant notifications
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Native App Experience</p>
              <p className="text-xs text-gray-600">Fast, smooth, and responsive</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Works Offline</p>
              <p className="text-xs text-gray-600">Access bookings without internet</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Push Notifications</p>
              <p className="text-xs text-gray-600">Never miss a booking update</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button className="w-full" onClick={handleInstall}>
            <Zap className="w-4 h-4 mr-2" />
            Install App
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleDismiss}>
            Maybe Later
          </Button>
        </div>
      </Card>
    </div>
  );
}
