/**
 * Gatekeeper Component
 * Legal consent modal with forced scroll for Alabama compliance
 * Users must scroll through full legal text before accepting
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { getConsentText, recordConsent } from '../lib/consent-manager';

interface GatekeeperProps {
  onConsent?: (consentTimestamp: string) => void;
  userId?: string;
  apiKey?: string;
}

export default function Gatekeeper({ onConsent, userId, apiKey }: GatekeeperProps) {
  const [show, setShow] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [consentText, setConsentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const requiredInput = 'I AGREE';

  useEffect(() => {
    // Check if consent already exists
    const checkConsent = () => {
      const consentCookie = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('progno_consent='));

      if (consentCookie) {
        const timestamp = consentCookie.split('=')[1];
        const consentDate = new Date(timestamp);
        const daysSince = (Date.now() - consentDate.getTime()) / (1000 * 60 * 60 * 24);

        // Consent expires after 30 days
        if (daysSince < 30) {
          return; // Already consented, don't show
        }
      }

      // No valid consent, show gatekeeper
      setShow(true);
      setConsentText(getConsentText());
      // Lock body
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
      document.body.setAttribute('data-gatekeeper-active', 'true');
    };

    checkConsent();
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Require 95% scroll to enable acceptance
    if (scrollPercentage >= 0.95) {
      setHasScrolled(true);
    }
  };

  const handleAccept = async () => {
    if (userInput.trim() !== requiredInput) {
      alert(`Please type "${requiredInput}" exactly to confirm your agreement.`);
      return;
    }

    if (!hasScrolled) {
      alert('Please scroll through the entire legal text before accepting.');
      return;
    }

    try {
      const consentTimestamp = new Date().toISOString();

      // Record consent
      await recordConsent(
        userId || 'anonymous',
        consentText,
        {
          apiKey,
          ipAddress: undefined, // Will be set server-side
          userAgent: navigator.userAgent,
        }
      );

      // Set consent cookie (30 days expiry)
      const maxAge = 60 * 60 * 24 * 30; // 30 days
      const isProduction = window.location.protocol === 'https:';
      const secureFlag = isProduction ? '; secure' : '';
      document.cookie = `progno_consent=${consentTimestamp}; path=/; max-age=${maxAge}${secureFlag}; samesite=strict`;

      // Unlock body
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-gatekeeper-active');

      setShow(false);
      onConsent?.(consentTimestamp);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('prognoConsent', {
        detail: { timestamp: consentTimestamp }
      }));
    } catch (error) {
      console.error('[Gatekeeper] Failed to record consent:', error);
      alert('Failed to record consent. Please try again.');
    }
  };

  const handleDecline = () => {
    alert('You must agree to the terms to use this service.');
    // Keep gatekeeper visible
  };

  if (!show) {
    // Ensure body is unlocked when not showing
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-gatekeeper-active');
    }
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90"
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg p-8 max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Legal Acknowledgment Required
        </h2>

        <div className="mb-4 text-sm text-gray-600">
          <p className="font-semibold mb-2">
            Please read the following terms carefully. You must scroll through the entire text before accepting.
          </p>
          {!hasScrolled && (
            <p className="text-red-600 font-medium">
              ⚠️ Scroll to the bottom to enable the acceptance button.
            </p>
          )}
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto border-2 border-gray-300 rounded p-4 mb-4 bg-gray-50"
          style={{ maxHeight: '400px', minHeight: '300px' }}
        >
          <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800 leading-relaxed">
            {consentText}
          </pre>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type &quot;{requiredInput}&quot; to confirm your agreement:
          </label>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            placeholder={requiredInput}
            disabled={!hasScrolled}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleAccept}
            disabled={!hasScrolled || userInput.trim() !== requiredInput}
            className={`flex-1 px-6 py-3 rounded-lg font-bold text-white transition-colors ${
              hasScrolled && userInput.trim() === requiredInput
                ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            I Agree
          </button>
          <button
            onClick={handleDecline}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
          >
            Decline
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          This consent is valid for 30 days. You will be asked to renew after expiration.
        </p>
      </div>
    </div>
  );
}

