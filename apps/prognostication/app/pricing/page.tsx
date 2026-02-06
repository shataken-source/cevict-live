'use client';

import { useEffect, useState } from 'react';

type BillingType = 'weekly' | 'monthly';
type Tier = 'pro' | 'elite';

export default function PricingPage() {
  const [email, setEmail] = useState('');
  const [loadingButton, setLoadingButton] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setLoadingButton(null);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  };

  const handleCheckout = async (tier: Tier, billingType: BillingType) => {
    setError('');

    if (!email || !isValidEmail(email)) {
      setError('INVALID_EMAIL_FORMAT');
      return;
    }

    if (loadingButton) return;

    const buttonId = `${tier}-${billingType}`;
    setLoadingButton(buttonId);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          tier,
          billingType
        }),
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        setError('SERVER_ERROR');
        setLoadingButton(null);
        return;
      }

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        const msg = data.details ? `${data.error || 'Error'}: ${data.details}` : (data.error || 'CHECKOUT_FAILED');
        setError(msg);
        setLoadingButton(null);
      }
    } catch (err: any) {
      setError('NETWORK_ERROR');
      setLoadingButton(null);
    }
  };

  const isLoading = (tier: Tier, billingType: BillingType) => {
    return loadingButton === `${tier}-${billingType}`;
  };

  return (
    <div className="min-h-screen bg-black text-green-400 overflow-hidden">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Scanline effect */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px)',
        }}
      />

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 100%)',
      }} />

      {/* Header */}
      <header className="relative z-10 border-b border-green-900/50 backdrop-blur-sm bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-4">
              <div className="w-10 h-10 border-2 border-green-500 rounded flex items-center justify-center text-xl animate-pulse shadow-lg shadow-green-500/30">
                ◈
              </div>
              <div>
                <div className="font-mono text-xs text-green-600">SYSTEM.ONLINE</div>
                <div className="font-bold text-green-400 tracking-wider">PROGNOSTICATION</div>
              </div>
            </a>
            <div className="font-mono text-xs text-green-600" suppressHydrationWarning>
              {currentTime != null ? currentTime.toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="font-mono text-green-600 text-sm mb-4">
            {'>'} ACCESS_CONTROL
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-green-400 mb-4 tracking-tight">
            SELECT YOUR TIER
          </h1>
          <p className="text-green-600 font-mono text-sm mb-8">
            UNLOCK AI-POWERED KALSHI PREDICTION INTELLIGENCE
          </p>

          {/* Email Input */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-700 font-mono text-sm">{'>'}</span>
              <input
                type="email"
                placeholder="ENTER_EMAIL@DOMAIN.COM"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={!!loadingButton}
                className="w-full pl-8 pr-4 py-4 font-mono text-sm bg-black border border-green-800 text-green-400 placeholder-green-800 focus:outline-none focus:border-green-500 rounded disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="max-w-md mx-auto mt-4 p-3 bg-red-950/50 border border-red-800 rounded font-mono text-sm text-red-400">
              ⚠ ERROR: {error}
            </div>
          )}

          {loadingButton && (
            <div className="max-w-md mx-auto mt-4 p-3 bg-green-950/50 border border-green-800 rounded font-mono text-sm text-green-400 animate-pulse">
              ◌ PROCESSING... REDIRECTING TO SECURE CHECKOUT
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12" style={{ opacity: loadingButton ? 0.6 : 1 }}>

          {/* PRO Tier */}
          <div className="bg-black/80 border border-green-900 rounded-lg overflow-hidden hover:border-green-700 transition-all">
            {/* Terminal Header */}
            <div className="bg-green-950/50 border-b border-green-900 px-4 py-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="font-mono text-xs text-green-600">TIER_PRO.exe</span>
            </div>

            <div className="p-6">
              <div className="font-mono text-xs text-green-700 mb-2">LEVEL_01</div>
              <h2 className="text-2xl font-bold text-green-400 mb-4">PRO</h2>

              {/* Weekly */}
              <div className="bg-green-950/30 border border-green-900 rounded p-4 mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-green-400 font-mono">$9</span>
                  <span className="text-green-700 font-mono text-sm">// 7_DAYS</span>
                </div>
                <button
                  onClick={() => handleCheckout('pro', 'weekly')}
                  disabled={!!loadingButton}
                  className="w-full mt-3 py-3 font-mono text-sm bg-green-900/50 border border-green-700 text-green-400 rounded hover:bg-green-800/50 hover:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading('pro', 'weekly') ? '◌ PROCESSING...' : '▶ INITIALIZE_TRIAL'}
                </button>
              </div>

              {/* Monthly */}
              <div className="bg-cyan-950/30 border border-cyan-800 rounded p-4 relative">
                <div className="absolute -top-2 right-4 bg-cyan-600 text-black font-mono text-xs px-2 py-0.5 rounded">
                  -24%
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-cyan-400 font-mono">$19</span>
                  <span className="text-cyan-700 font-mono text-sm">// MONTH</span>
                </div>
                <button
                  onClick={() => handleCheckout('pro', 'monthly')}
                  disabled={!!loadingButton}
                  className="w-full mt-3 py-3 font-mono text-sm bg-cyan-900/50 border border-cyan-700 text-cyan-400 rounded hover:bg-cyan-800/50 hover:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading('pro', 'monthly') ? '◌ PROCESSING...' : '▶ SUBSCRIBE_MONTHLY'}
                </button>
              </div>

              {/* Features */}
              <div className="mt-6 space-y-2 font-mono text-sm">
                <div className="text-green-700 text-xs mb-3">// FEATURES</div>
                {[
                  '[✓] 5 PICKS/DAY',
                  '[✓] ALL 6 CATEGORIES',
                  '[✓] EDGE CALCULATION',
                  '[✓] AI REASONING',
                  '[✓] EMAIL ALERTS',
                ].map((feature, i) => (
                  <div key={i} className="text-green-500">{feature}</div>
                ))}
              </div>
            </div>
          </div>

          {/* ELITE Tier */}
          <div className="bg-black/80 border-2 border-amber-700 rounded-lg overflow-hidden shadow-lg shadow-amber-900/20 relative">
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-mono text-xs font-bold px-4 py-1 rounded">
              RECOMMENDED
            </div>

            {/* Terminal Header */}
            <div className="bg-amber-950/50 border-b border-amber-900 px-4 py-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500/80 animate-pulse" />
              <span className="font-mono text-xs text-amber-600">TIER_ELITE.exe</span>
            </div>

            <div className="p-6">
              <div className="font-mono text-xs text-amber-700 mb-2">LEVEL_MAX</div>
              <h2 className="text-2xl font-bold text-amber-400 mb-4">ELITE</h2>

              {/* Weekly */}
              <div className="bg-amber-950/30 border border-amber-900 rounded p-4 mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-amber-400 font-mono">$29</span>
                  <span className="text-amber-700 font-mono text-sm">// 7_DAYS</span>
                </div>
                <button
                  onClick={() => handleCheckout('elite', 'weekly')}
                  disabled={!!loadingButton}
                  className="w-full mt-3 py-3 font-mono text-sm bg-amber-900/50 border border-amber-700 text-amber-400 rounded hover:bg-amber-800/50 hover:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading('elite', 'weekly') ? '◌ PROCESSING...' : '▶ INITIALIZE_TRIAL'}
                </button>
              </div>

              {/* Monthly */}
              <div className="bg-gradient-to-r from-amber-950/50 to-orange-950/50 border border-amber-600 rounded p-4 relative">
                <div className="absolute -top-2 right-4 bg-amber-500 text-black font-mono text-xs font-bold px-2 py-0.5 rounded">
                  BEST VALUE
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-amber-300 font-mono">$49</span>
                  <span className="text-amber-700 font-mono text-sm">// MONTH</span>
                </div>
                <button
                  onClick={() => handleCheckout('elite', 'monthly')}
                  disabled={!!loadingButton}
                  className="w-full mt-3 py-3 font-mono text-sm bg-amber-600 text-black font-bold rounded hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-600/30"
                >
                  {isLoading('elite', 'monthly') ? '◌ PROCESSING...' : '▶ SUBSCRIBE_ELITE'}
                </button>
              </div>

              {/* Features */}
              <div className="mt-6 space-y-2 font-mono text-sm">
                <div className="text-amber-700 text-xs mb-3">// FULL_ACCESS</div>
                {[
                  '[✓] UNLIMITED PICKS',
                  '[✓] ALL 6 CATEGORIES',
                  '[✓] HISTORICAL PATTERNS',
                  '[✓] SMS + EMAIL ALERTS',
                  '[✓] DISCORD ACCESS',
                  '[✓] STRATEGY CALLS',
                  '[✓] ENTERTAINMENT EXPERT',
                  '[✓] PRIORITY SUPPORT',
                ].map((feature, i) => (
                  <div key={i} className="text-amber-500">{feature}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Terminal */}
        <div className="bg-black/80 border border-green-900 rounded-lg overflow-hidden mb-12">
          <div className="bg-green-950/50 border-b border-green-900 px-4 py-2 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="font-mono text-xs text-green-600">COMPARE_TIERS.log</span>
          </div>
          <div className="p-6 font-mono text-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-green-700 border-b border-green-900">
                  <th className="text-left py-2">FEATURE</th>
                  <th className="text-center py-2">PRO</th>
                  <th className="text-center py-2 text-amber-500">ELITE</th>
                </tr>
              </thead>
              <tbody className="text-green-500">
                {[
                  { feature: 'Picks per day', pro: '5', elite: '∞' },
                  { feature: 'Market categories', pro: '6', elite: '6' },
                  { feature: 'AI reasoning', pro: '✓', elite: '✓' },
                  { feature: 'Edge calculation', pro: '✓', elite: '✓' },
                  { feature: 'Historical patterns', pro: 'BASIC', elite: 'FULL' },
                  { feature: 'SMS alerts', pro: '—', elite: '✓' },
                  { feature: 'Discord access', pro: '—', elite: '✓' },
                  { feature: 'Entertainment expert', pro: '—', elite: '✓' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-green-900/50">
                    <td className="py-2 text-green-600">{row.feature}</td>
                    <td className="text-center py-2">{row.pro}</td>
                    <td className="text-center py-2 text-amber-400">{row.elite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="text-center font-mono text-xs text-green-700 space-y-2">
          <p>🔒 SECURE_CHECKOUT VIA STRIPE</p>
          <p>💳 ALL_MAJOR_CARDS ACCEPTED</p>
          <p>❌ CANCEL_ANYTIME // NO_HIDDEN_FEES</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-green-900/50 py-8 bg-black/50">
        <div className="max-w-7xl mx-auto px-4 text-center font-mono text-xs text-green-800">
          <p>© {new Date().getFullYear()} PROGNOSTICATION.COM // THE FUTURE, CALCULATED.</p>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.5); }
        }
      `}</style>
    </div>
  );
}
