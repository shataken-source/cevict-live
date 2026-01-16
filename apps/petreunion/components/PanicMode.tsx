'use client';

import { useState } from 'react';
import { AlertCircle, Camera, MapPin, Phone, Send } from 'lucide-react';

/**
 * Panic Mode UI - Functional Minimalism for High-Stress Situations
 * Addresses UX audit finding: "Too engaging, not enough functional"
 * 
 * Best Practice: Single-action UI for users in panic state
 */
export default function PanicMode() {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState<'type' | 'photo' | 'location' | 'contact'>('type');
  const [formData, setFormData] = useState({
    type: 'lost' as 'lost' | 'found',
    photo: null as File | null,
    location: '',
    contact: '',
  });

  if (!isActive) {
    return (
      <div id="panic-mode">
        <button
          onClick={() => setIsActive(true)}
          className="fixed bottom-6 right-6 z-50 text-white p-4 rounded-full shadow-2xl transition-all group"
          style={{
            backgroundColor: 'var(--panic-orange)',
            boxShadow: '0 0 15px rgba(249, 115, 22, 0.35)',
          }}
          aria-label="Emergency: Report lost or found pet"
          title="Quick Report"
        >
          <AlertCircle className="w-6 h-6" />
          {/* Text only visible on hover */}
          <span className="absolute right-full mr-3 whitespace-nowrap text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: 'var(--panic-orange)' }}>
            Quick Report
          </span>
        </button>
      </div>
    );
  }

  return (
    <div id="panic-mode" className="fixed inset-0 z-50 bg-white">
      <div className="max-w-md mx-auto h-full flex flex-col">
        {/* Minimal Header */}
        <div className="text-white p-4 flex items-center justify-between" style={{ backgroundColor: 'var(--panic-orange)' }}>
          <h1 className="text-2xl font-bold">PANIC MODE</h1>
          <button
            onClick={() => setIsActive(false)}
            className="text-white rounded p-2"
          >
            ✕
          </button>
        </div>

        {/* Single-Step Form - Minimal Distractions */}
        <div className="flex-1 p-6">
          {step === 'type' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-6">What happened?</h2>
              <button
                onClick={() => {
                  setFormData({ ...formData, type: 'lost' });
                  setStep('photo');
                }}
                className="w-full p-8 bg-orange-50 border-4 rounded-lg text-left hover:bg-orange-100"
                style={{ borderColor: 'var(--panic-orange)' }}
              >
                <div className="text-3xl mb-2">😢</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--panic-orange)' }}>I LOST MY PET</div>
                <div className="text-gray-600 mt-2">Report immediately</div>
              </button>
              <button
                onClick={() => {
                  setFormData({ ...formData, type: 'found' });
                  setStep('photo');
                }}
                className="w-full p-8 bg-blue-50 border-4 rounded-lg text-left hover:bg-blue-100"
                style={{ borderColor: 'var(--safety-blue)' }}
              >
                <div className="text-3xl mb-2">🎉</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--safety-blue)' }}>I FOUND A PET</div>
                <div className="text-gray-600 mt-2">Help reunite</div>
              </button>
            </div>
          )}

          {step === 'photo' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Add Photo</h2>
              <label className="block p-8 border-4 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500">
                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <div className="text-lg font-medium">Tap to add photo</div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({ ...formData, photo: file });
                      setStep('location');
                    }
                  }}
                />
              </label>
              <button
                onClick={() => setStep('location')}
                className="w-full p-4 bg-gray-200 rounded-lg"
              >
                Skip Photo
              </button>
            </div>
          )}

          {step === 'location' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Location (Fuzzy)</h2>
              <p className="text-sm text-gray-600 mb-4">
                We'll show approximate area, not exact address, for your safety.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="City or Zip Code"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg"
                />
                <button
                  onClick={() => {
                    // Use fuzzy geolocation (not precise GPS)
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        // Round to ~1km accuracy (fuzzy)
                        const fuzzyLat = Math.round(position.coords.latitude * 10) / 10;
                        const fuzzyLon = Math.round(position.coords.longitude * 10) / 10;
                        setFormData({ ...formData, location: `${fuzzyLat}, ${fuzzyLon}` });
                        setStep('contact');
                      },
                      () => {
                        setStep('contact');
                      }
                    );
                  }}
                className="w-full p-4 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--safety-blue)' }}
                >
                  <MapPin className="w-5 h-5" />
                  Use Approximate Location
                </button>
              </div>
            </div>
          )}

          {step === 'contact' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Contact Info</h2>
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg"
              />
              <button
                onClick={async () => {
                  // Submit with fuzzy location
                  await fetch('/api/petreunion/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...formData,
                      fuzzyLocation: true, // Flag for fuzzy geolocation
                    }),
                  });
                  alert('Report submitted! Help is on the way.');
                  setIsActive(false);
                }}
                className="w-full p-6 text-white rounded-lg font-bold text-xl flex items-center justify-center gap-3"
                style={{ backgroundColor: 'var(--panic-orange)' }}
              >
                <Send className="w-6 h-6" />
                SUBMIT REPORT
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

