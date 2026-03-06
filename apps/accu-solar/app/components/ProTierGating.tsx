import React from 'react';

interface ProFeatureLockProps {
  feature: string;
  description?: string;
  onUpgradeClick?: () => void;
}

export function ProFeatureLock({
  feature,
  description,
  onUpgradeClick,
}: ProFeatureLockProps) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100">
          <span className="text-4xl">🔒</span>
        </div>

        <h3 className="text-xl font-bold text-gray-900">{feature}</h3>

        {description && <p className="text-sm text-gray-600">{description}</p>}

        <div className="pt-4">
          <p className="text-xs text-gray-700 mb-3">This feature is available with</p>
          <div className="inline-block px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold rounded-full text-sm">
            ⭐ Pro Tier
          </div>
        </div>

        <button
          onClick={onUpgradeClick}
          className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
        >
          Upgrade to Pro
        </button>

        <p className="text-xs text-gray-600">
          Pro includes scenario simulator, PDF reports, 90-day history, and more
        </p>
      </div>
    </div>
  );
}

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function ProUpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
}: ProUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-blue-100">
            <span className="text-4xl">⭐</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Unlock Pro Features</h2>

          <p className="text-gray-600">
            Get access to powerful tools designed for serious solar optimization
          </p>

          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-sm text-gray-700">
                <strong>Scenario Simulator</strong> - Model "what-if" upgrades with tilt & voltage warnings
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-sm text-gray-700">
                <strong>Graphics-Heavy Reports</strong> - Beautiful PDF reports with charts & ROI analysis
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-sm text-gray-700">
                <strong>90-Day History</strong> - Track production trends & seasonal patterns
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-sm text-gray-700">
                <strong>AI Recommendations</strong> - Get ROI-ranked upgrade suggestions
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-sm text-gray-700">
                <strong>Export Data</strong> - Download to CSV, Excel, or integrate with other tools
              </p>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={onUpgrade}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-lg transition-colors"
            >
              Upgrade Now
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-lg transition-colors"
            >
              Maybe Later
            </button>
          </div>

          <p className="text-xs text-gray-600">
            Cancel anytime. No questions asked.
          </p>
        </div>
      </div>
    </div>
  );
}

interface TierBadgeProps {
  tier: 'basic' | 'pro';
  feature?: string;
}

export function TierBadge({ tier, feature }: TierBadgeProps) {
  if (tier === 'basic') return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-100 to-blue-100 border border-green-300 rounded text-xs font-bold text-green-800">
      <span>⭐</span>
      <span>PRO</span>
      {feature && <span className="text-green-700">• {feature}</span>}
    </div>
  );
}
