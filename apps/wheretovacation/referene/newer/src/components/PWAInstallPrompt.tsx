import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X, Smartphone, Zap, Wifi } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') setIsInstalled(true);
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  const dismissed = localStorage.getItem('pwa-dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return null;
  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-20 right-4 left-4 md:left-auto md:right-6 z-50 max-w-md mx-auto md:mx-0">
      <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white rounded-2xl shadow-2xl p-6 relative overflow-hidden border-2 border-white/20">
        <button onClick={handleDismiss} className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full transition z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
              <Download className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Install Gulf Coast Charters</h4>
              <p className="text-xs text-blue-100">Get instant access to your fishing adventures</p>
            </div>
          </div>

          <div className="space-y-2 mb-5 bg-white/10 rounded-lg p-3 backdrop-blur">
            <div className="flex items-center gap-2 text-sm"><Zap className="w-4 h-4 text-yellow-300" /><span>Lightning fast - works like a native app</span></div>
            <div className="flex items-center gap-2 text-sm"><Wifi className="w-4 h-4 text-green-300" /><span>Works offline - access bookings anywhere</span></div>
            <div className="flex items-center gap-2 text-sm"><Smartphone className="w-4 h-4 text-purple-300" /><span>Add to home screen - one tap access</span></div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleInstall} className="flex-1 bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg">Install Now</Button>
            <Button onClick={handleDismiss} variant="outline" className="text-white border-white/40 hover:bg-white/20">Not Now</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
