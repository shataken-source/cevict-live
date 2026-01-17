'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Shield, BarChart3, Target } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('petreunion_cookiePreferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    } else {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem('petreunion_cookiePreferences', JSON.stringify(allAccepted));
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    setPreferences(onlyNecessary);
    localStorage.setItem('petreunion_cookiePreferences', JSON.stringify(onlyNecessary));
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('petreunion_cookiePreferences', JSON.stringify(preferences));
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">Cookie Consent</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  We use cookies to enhance your experience and help reunite pets. 
                  You can customize your preferences. See our{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAcceptAll}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleRejectAll}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={() => {
                      setShowBanner(false);
                      setShowSettings(true);
                    }}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Customize
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Cookie Preferences</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-lg text-gray-900">Necessary Cookies</h3>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.necessary}
                    disabled
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
                <p className="text-sm text-gray-600 ml-8">
                  Essential for the website to function. Cannot be disabled.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-lg text-gray-900">Analytics Cookies</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-8">
                  Help us understand how visitors use the site to improve pet reunions.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-lg text-gray-900">Marketing Cookies</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-8">
                  Used to show relevant content and support our free service.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

