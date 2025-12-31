'use client';

/**
 * PWA Install Prompt
 * Prompts users to install the app on their device
 */

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check localStorage for dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // Show again after 7 days
      if (now.getTime() - dismissedDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 30 seconds on site
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show prompt immediately if user is returning
    const visits = parseInt(localStorage.getItem('site-visits') || '0');
    localStorage.setItem('site-visits', String(visits + 1));
    if (visits > 2) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  };

  if (isInstalled || !showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl">
        <div className="flex gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
            🎯
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg mb-1">
              Install Prognostication
            </h3>
            <p className="text-purple-200 text-sm mb-3">
              Get instant push notifications for high-confidence picks and never miss a winning opportunity!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-white text-purple-900 font-bold py-2 px-4 rounded-xl hover:bg-purple-100 transition-all text-sm"
              >
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-purple-300 hover:text-white transition-all text-sm"
              >
                Later
              </button>
            </div>
          </div>
        </div>
        
        {/* Benefits */}
        <div className="mt-4 pt-4 border-t border-purple-500/30 grid grid-cols-3 gap-2 text-center">
          {[
            { icon: '🔔', label: 'Push Alerts' },
            { icon: '⚡', label: 'Faster' },
            { icon: '📱', label: 'Offline' },
          ].map(benefit => (
            <div key={benefit.label} className="text-xs text-purple-300">
              <span className="text-lg">{benefit.icon}</span>
              <div>{benefit.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

