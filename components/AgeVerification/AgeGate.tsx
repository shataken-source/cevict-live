/**
 * Age Gate Component - Layer 1 Soft Verification
 * 
 * First line of defense for age verification
 * Sets 7-day cookie, excludes crawlers for SEO
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Calendar, Shield, ArrowRight } from 'lucide-react';
import { ageVerificationService } from '@/lib/ageVerification';

interface AgeGateProps {
  onVerified?: () => void;
  returnUrl?: string;
  showLegalWarning?: boolean;
}

export default function AgeGate({ onVerified, returnUrl, showLegalWarning = true }: AgeGateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already verified
    checkExistingVerification();
  }, []);

  const checkExistingVerification = async () => {
    try {
      const result = await ageVerificationService.softAgeGate();
      if (result.allowed) {
        onVerified?.();
      }
    } catch (err) {
      console.error('Error checking verification:', err);
    }
  };

  const handleAgeConfirmation = async (isOver21: boolean) => {
    if (!isOver21) {
      setError('You must be 21 or older to access this content.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Set soft verification cookie
      if (typeof document !== 'undefined') {
        document.cookie = `pref_age_verified=${Date.now()}; path=/; max-age=${60 * 60 * 24 * 7}; secure; samesite=strict`;
      }

      // Log compliance event
      await fetch('/api/compliance/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'age_gate_passed',
          details: { method: 'soft_gate', timestamp: new Date().toISOString() }
        })
      });

      onVerified?.();

      // Redirect if return URL provided
      if (returnUrl) {
        window.location.href = decodeURIComponent(returnUrl);
      }

    } catch (err) {
      console.error('Error setting age verification:', err);
      setError('Unable to verify age. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFullVerification = () => {
    const url = returnUrl 
      ? `/age-verify/full?return=${encodeURIComponent(returnUrl)}`
      : '/age-verify/full';
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%239C92AC&quot; fill-opacity=&quot;0.4&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;)]"></div>
      </div>

      <div className="relative w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Age Verification Required
            </CardTitle>
            <CardDescription className="text-slate-600">
              This content contains tobacco and nicotine-related information
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Legal Warning */}
            {showLegalWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <strong>Federal Law Warning:</strong> You must be 21 years or older to access tobacco and nicotine-related content. 
                    False statements are punishable by law.
                  </div>
                </div>
              </div>
            )}

            {/* Age Confirmation */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <Calendar className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Are you 21 years of age or older?
                </h3>
                <p className="text-sm text-slate-600">
                  Confirm your age to continue
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleAgeConfirmation(false)}
                  disabled={loading}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  No (Under 21)
                </Button>
                <Button
                  onClick={() => handleAgeConfirmation(true)}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying...
                    </div>
              ) : (
                <div className="flex items-center gap-2">
                  Yes (21+)
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Full Verification Option */}
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-3">
                For purchases or community features, full verification is required
              </p>
              <Button
                variant="outline"
                onClick={handleFullVerification}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Verify with ID for Full Access
              </Button>
            </div>

            {/* Legal Information */}
            <div className="text-xs text-slate-500 space-y-1">
              <p>
                By proceeding, you acknowledge that you are 21 years of age or older and 
                agree to our Terms of Service and Privacy Policy.
              </p>
              <p>
                This verification is required by federal law for tobacco and nicotine content. 
                Your information is protected and used only for compliance purposes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center mt-6 space-y-2">
          <div className="flex justify-center gap-6 text-sm">
            <a 
              href="/terms" 
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Terms of Service
            </a>
            <a 
              href="/privacy" 
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Privacy Policy
            </a>
            <a 
              href="/compliance" 
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Compliance Info
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Protected by AgeChecker.net • FDA Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
