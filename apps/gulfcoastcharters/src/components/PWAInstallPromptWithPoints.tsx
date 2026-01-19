import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function PWAInstallPromptWithPoints() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const installed = localStorage.getItem('pwa-installed');
      if (!dismissed && !installed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true');
      
      if (user) {
        try {
          await supabase.functions.invoke('points-rewards-system', {
            body: { 
              action: 'add',
              userId: user.id,
              points: 100,
              reason: 'PWA Installation'
            }
          });

          toast({
            title: '🎉 App Installed!',
            description: 'You earned 100 bonus points!',
          });
        } catch (error) {
          console.error('Points error:', error);
        }
      }
    }

    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <Card className="fixed bottom-20 left-4 right-4 md:left-auto md:right-20 md:w-96 p-4 shadow-2xl z-40 border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDismiss}
        className="absolute top-2 right-2"
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Download className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Install Gulf Coast Charters</h3>
          <p className="text-sm text-gray-600 mb-3">
            Get faster access and work offline. Plus, earn <span className="font-bold text-blue-600">100 bonus points</span>!
          </p>
          <div className="flex gap-2">
            <Button onClick={handleInstall} className="flex-1" size="sm">
              <Gift className="w-4 h-4 mr-2" />
              Install & Earn Points
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm">
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
