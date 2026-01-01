'use client';

import { useState, useEffect } from 'react';

// Kalshi Market Categories
const CATEGORIES = [
  { id: 'politics', name: 'POLITICS', icon: '🗳️', color: 'text-red-400', glow: 'shadow-red-500/50' },
  { id: 'economics', name: 'ECONOMICS', icon: '📈', color: 'text-green-400', glow: 'shadow-green-500/50' },
  { id: 'weather', name: 'WEATHER', icon: '🌡️', color: 'text-cyan-400', glow: 'shadow-cyan-500/50' },
  { id: 'entertainment', name: 'ENTERTAINMENT', icon: '🎬', color: 'text-fuchsia-400', glow: 'shadow-fuchsia-500/50' },
  { id: 'crypto', name: 'CRYPTO', icon: '🪙', color: 'text-amber-400', glow: 'shadow-amber-500/50' },
  { id: 'world', name: 'WORLD', icon: '🌍', color: 'text-violet-400', glow: 'shadow-violet-500/50' },
];

interface KalshiPick {
  id: string;
  market: string;
  category: string;
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  marketId?: string; // Kalshi market ID for referral links
}

// Matrix rain effect component - client-only to prevent hydration errors
function MatrixRain() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Don't render on server
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute text-green-500 font-mono text-xs animate-matrix-fall"
          style={{
            left: `${i * 5}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${10 + Math.random() * 10}s`,
          }}
        >
          {[...Array(30)].map((_, j) => (
            <div key={j} className="opacity-70">
              {String.fromCharCode(0x30A0 + Math.random() * 96)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Glitch text effect
function GlitchText({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <span className="absolute top-0 left-0 -ml-[2px] text-cyan-500 opacity-70 animate-glitch-1" aria-hidden="true">
        {children}
      </span>
      <span className="absolute top-0 left-0 ml-[2px] text-fuchsia-500 opacity-70 animate-glitch-2" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}

// Terminal-style typing effect
function TypeWriter({ text, speed = 50 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(prev => prev + text[index]);
        setIndex(index + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [index, text, speed]);

  return (
    <span className="font-mono">
      {displayed}
      <span className="animate-pulse">▊</span>
    </span>
  );
}

export default function HomePage() {
  const [todaysPicks, setTodaysPicks] = useState<KalshiPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    accuracy: 0,
    roi: 0,
    activeBets: 0,
    totalAnalyzed: 0
  });

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadPicks() {
      try {
        const res = await fetch('/api/kalshi/picks?limit=6');
        if (res.ok) {
          const data = await res.json();
          setTodaysPicks(data.picks || []);
        }
      } catch (e) {
        console.warn('Failed to load picks:', e);
      } finally {
        setLoading(false);
      }
    }
    loadPicks();
  }, []);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats({
            accuracy: data.accuracy || 0,
            roi: data.roi || 0,
            activeBets: data.active || 0,
            totalAnalyzed: data.analyzed || 0
          });
        }
      } catch (e) {
        console.warn('Failed to load stats:', e);
      }
    }
    
    // Load stats immediately and then every 30 seconds
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredPicks = activeCategory === 'all'
    ? todaysPicks
    : todaysPicks.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-black text-green-400 overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain />

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

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-green-900/50 backdrop-blur-sm bg-black/50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border-2 border-green-500 rounded flex items-center justify-center text-xl animate-pulse shadow-lg shadow-green-500/30">
                  ◈
                </div>
                <div>
                  <div className="font-mono text-xs text-green-600">SYSTEM.ONLINE</div>
                  <div className="font-bold text-green-400 tracking-wider">PROGNOSTICATION</div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6 font-mono text-sm">
                <a href="/picks" className="text-green-500 hover:text-green-300 transition-colors">[PICKS]</a>
                <a href="/pricing" className="text-green-500 hover:text-green-300 transition-colors">[ACCESS]</a>
                <a href="/about" className="text-green-500 hover:text-green-300 transition-colors">[ABOUT]</a>
              </div>
              <div className="font-mono text-xs text-green-600">
                {mounted && currentTime ? currentTime.toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            {/* Main Logo */}
            <div className="mb-8">
              <div className="inline-block relative">
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
                  <GlitchText className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-green-400">
                    PROGNOSTICATION
                  </GlitchText>
                </h1>
                <div className="absolute -inset-4 bg-green-500/10 blur-3xl -z-10 animate-pulse" />
              </div>
            </div>

            {/* Tagline */}
            <div className="mb-8">
              <p className="text-2xl md:text-4xl font-bold text-cyan-400 mb-4 tracking-wide">
                THE FUTURE, CALCULATED.
              </p>
              <div className="font-mono text-green-600 text-sm md:text-base">
                <TypeWriter text="// AI-POWERED KALSHI PREDICTION INTELLIGENCE" speed={30} />
              </div>
            </div>

            {/* Kalshi Badge */}
            <div className="inline-flex items-center gap-3 bg-green-950/50 border border-green-800 rounded px-4 py-2 font-mono text-sm mb-12">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              <span className="text-green-500">CFTC REGULATED</span>
              <span className="text-green-700">|</span>
              <span className="text-green-500">LEGAL USA</span>
              <span className="text-green-700">|</span>
              <span className="text-green-500">REAL-TIME</span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
              {[
                { label: 'ACCURACY', value: `${stats.accuracy}%`, icon: '◉' },
                { label: 'AVG ROI', value: `+${stats.roi}%`, icon: '▲' },
                { label: 'ACTIVE', value: stats.activeBets.toString(), icon: '◈' },
                { label: 'ANALYZED', value: stats.totalAnalyzed.toLocaleString(), icon: '◇' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-black/50 border border-green-900 rounded p-4 hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-500/20 group"
                >
                  <div className="text-green-700 text-xs font-mono mb-1 group-hover:text-green-500 transition-colors">
                    {stat.icon} {stat.label}
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-green-400 font-mono">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 font-mono text-sm border rounded transition-all ${
                activeCategory === 'all'
                  ? 'bg-green-500 text-black border-green-500 shadow-lg shadow-green-500/30'
                  : 'bg-transparent text-green-500 border-green-800 hover:border-green-500'
              }`}
            >
              [ALL_MARKETS]
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 font-mono text-sm border rounded transition-all flex items-center gap-2 ${
                  activeCategory === cat.id
                    ? `bg-green-500/20 ${cat.color} border-current shadow-lg ${cat.glow}`
                    : 'bg-transparent text-green-600 border-green-900 hover:border-green-600'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="hidden sm:inline">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Picks Terminal */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="bg-black/80 border border-green-900 rounded-lg overflow-hidden shadow-2xl shadow-green-900/20">
              {/* Terminal Header */}
              <div className="bg-green-950/50 border-b border-green-900 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="font-mono text-xs text-green-600">
                  PROGNO_TERMINAL v2.0 — {filteredPicks.length} SIGNALS DETECTED
                </div>
                <div className="font-mono text-xs text-green-700">
                  {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Terminal Content */}
              <div className="p-6 font-mono text-sm">
                <div className="text-green-600 mb-4">
                  {'>'} INITIALIZING PREDICTION ENGINE...<br/>
                  {'>'} SCANNING KALSHI MARKETS...<br/>
                  {'>'} <span className="text-cyan-400">EDGE DETECTED. LOADING SIGNALS...</span>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin text-4xl mb-4">◌</div>
                    <p className="text-green-600">PROCESSING...</p>
                  </div>
                ) : filteredPicks.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPicks.map((pick, i) => {
                      const category = CATEGORIES.find(c => c.id === pick.category);
                      // Generate Kalshi referral link with YOUR referral code
                      const kalshiReferralCode = process.env.NEXT_PUBLIC_KALSHI_REFERRAL_CODE || 'CEVICT2025';
                      const kalshiMarketUrl = pick.marketId
                        ? `https://kalshi.com/markets/${pick.marketId}?referral=${kalshiReferralCode}`
                        : `https://kalshi.com?referral=${kalshiReferralCode}`;

                      // Track when user clicks to Kalshi
                      const handleKalshiClick = () => {
                        // Optional: Send analytics event
                        if (typeof window !== 'undefined' && (window as any).gtag) {
                          (window as any).gtag('event', 'kalshi_referral_click', {
                            market_id: pick.marketId,
                            pick_side: pick.pick,
                            edge: pick.edge,
                            referral_code: kalshiReferralCode
                          });
                        }
                      };

                      return (
                        <div
                          key={i}
                          className="border border-green-900 rounded p-4 hover:border-green-500 transition-all bg-green-950/20 hover:bg-green-950/40 group"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs ${category?.color || 'text-green-500'}`}>
                                  [{category?.name || pick.category.toUpperCase()}]
                                </span>
                                <span className="text-green-800">|</span>
                                <span className="text-green-700 text-xs">{pick.id}</span>
                              </div>
                              <p className="text-green-300 group-hover:text-green-200 transition-colors">
                                {pick.market}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded font-bold text-sm ${
                              pick.pick === 'YES'
                                ? 'bg-green-500/20 text-green-400 border border-green-500'
                                : 'bg-red-500/20 text-red-400 border border-red-500'
                            }`}>
                              {pick.pick}
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                            <a
                              href={kalshiMarketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleKalshiClick}
                              className="hover:scale-105 transition-transform cursor-pointer"
                              title="Click to make your pick on Kalshi"
                            >
                              <span className="text-green-700">PROB:</span>
                              <span className="text-green-400 ml-1 underline decoration-dotted hover:text-green-300">{pick.probability}%</span>
                            </a>
                            <div>
                              <span className="text-green-700">MARKET:</span>
                              <span className="text-cyan-400 ml-1">{pick.marketPrice}¢</span>
                            </div>
                            <div>
                              <span className="text-green-700">EDGE:</span>
                              <span className="text-green-400 ml-1">+{pick.edge}%</span>
                            </div>
                            <div>
                              <span className="text-green-700">EXP:</span>
                              <span className="text-green-600 ml-1">{new Date(pick.expires).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-green-700 italic mb-3">
                            // {pick.reasoning}
                          </div>

                          {/* PICK NOW Button with Referral Link */}
                          <a
                            href={kalshiMarketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleKalshiClick}
                            className="block w-full text-center py-2 px-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-black font-bold rounded transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 text-sm group/bet hover:scale-105"
                          >
                            <span className="flex items-center justify-center gap-2">
                              <span>🎯 PICK NOW ON KALSHI</span>
                              <span className="text-xs opacity-75 group-hover/bet:opacity-100">→</span>
                            </span>
                            <span className="block text-xs mt-1 opacity-60">
                              Using referral code: {kalshiReferralCode}
                            </span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-green-600">NO SIGNALS IN SELECTED CATEGORY</p>
                    <p className="text-green-800 text-xs mt-2">TRY [ALL_MARKETS] OR CHECK BACK LATER</p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-green-900">
                  <a
                    href="/pricing"
                    className="block w-full text-center py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-black font-bold rounded hover:from-green-500 hover:to-cyan-500 transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50"
                  >
                    ▶ UNLOCK FULL ACCESS — START FREE TRIAL
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Market Categories Grid */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-center font-mono text-green-600 text-sm mb-8">
              {'>'} PREDICTION DOMAINS
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CATEGORIES.map((cat, i) => (
                <div
                  key={cat.id}
                  className="group bg-black/50 border border-green-900 rounded-lg p-6 hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-500/10 cursor-pointer"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <div className={`text-4xl mb-4 ${cat.color} group-hover:scale-110 transition-transform`}>
                    {cat.icon}
                  </div>
                  <div className={`font-mono font-bold mb-2 ${cat.color}`}>
                    {cat.name}
                  </div>
                  <div className="text-green-700 text-xs font-mono">
                    {cat.id === 'politics' && 'ELECTIONS • POLICY • LEADERS'}
                    {cat.id === 'economics' && 'FED • GDP • INFLATION'}
                    {cat.id === 'weather' && 'TEMPS • STORMS • CLIMATE'}
                    {cat.id === 'entertainment' && 'OSCARS • BOX OFFICE • AWARDS'}
                    {cat.id === 'crypto' && 'BTC • ETH • MARKETS'}
                    {cat.id === 'world' && 'GEOPOLITICS • SPACE • TECH'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-mono text-green-600 text-sm mb-6">{'>'} POWERED BY</h2>
            <div className="flex flex-wrap justify-center gap-4 font-mono text-xs">
              {[
                'CLAUDE_EFFECT',
                '11_GEMINI_MODELS',
                'MONTE_CARLO_SIM',
                'KELLY_CRITERION',
                'HISTORICAL_PATTERNS',
                'SENTIMENT_ANALYSIS',
              ].map((tech, i) => (
                <span key={i} className="px-3 py-1 bg-green-950/50 border border-green-900 rounded text-green-500">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-green-950/30 border border-green-800 rounded-lg p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-green-400 mb-4">
                READY TO SEE THE FUTURE?
              </h2>
              <p className="text-green-600 mb-6 font-mono text-sm">
                JOIN THOUSANDS USING AI TO BEAT PREDICTION MARKETS
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/pricing"
                  className="px-8 py-4 bg-green-500 text-black font-bold rounded hover:bg-green-400 transition-all shadow-lg shadow-green-500/30"
                >
                  ▶ GET ACCESS
                </a>
                <a
                  href="/picks"
                  className="px-8 py-4 bg-transparent border border-green-500 text-green-500 font-bold rounded hover:bg-green-500/10 transition-all"
                >
                  VIEW ALL PICKS
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-green-900/50 mt-16 py-8 bg-black/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-green-700">
              <div>© {new Date().getFullYear()} PROGNOSTICATION.COM</div>
              <div className="flex gap-4">
                <a href="/terms" className="hover:text-green-500">[TERMS]</a>
                <a href="/privacy" className="hover:text-green-500">[PRIVACY]</a>
                <a href="/disclaimer" className="hover:text-green-500">[DISCLAIMER]</a>
              </div>
              <div className="text-green-800">NOT AFFILIATED WITH KALSHI INC.</div>
            </div>
            <div className="text-center mt-4 text-green-800 text-xs">
              ⚠ PREDICTION MARKETS INVOLVE RISK. TRADE RESPONSIBLY.
            </div>
          </div>
        </footer>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes matrix-fall {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes glitch-1 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          20% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
          40% { clip-path: inset(40% 0 40% 0); transform: translate(2px, -2px); }
          60% { clip-path: inset(60% 0 20% 0); transform: translate(-1px, 1px); }
          80% { clip-path: inset(80% 0 0% 0); transform: translate(1px, -1px); }
        }

        @keyframes glitch-2 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          20% { clip-path: inset(60% 0 20% 0); transform: translate(2px, -2px); }
          40% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
          60% { clip-path: inset(80% 0 0% 0); transform: translate(1px, -1px); }
          80% { clip-path: inset(40% 0 40% 0); transform: translate(-1px, 1px); }
        }

        .animate-matrix-fall {
          animation: matrix-fall linear infinite;
        }

        .animate-glitch-1 {
          animation: glitch-1 2s infinite linear alternate-reverse;
        }

        .animate-glitch-2 {
          animation: glitch-2 2s infinite linear alternate-reverse;
          animation-delay: 0.1s;
        }
      `}</style>
    </div>
  );
}
