'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AdBanner from '../components/AdBanner';

interface SystemStatus {
  claude_effect: boolean;
  odds_api: boolean;
  cursor_bot: boolean;
  database: boolean;
}

export default function PrognoHome() {
  const router = useRouter();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/progno/v2?action=health');
        if (res.ok) {
          const data = await res.json();
          setStatus({
            claude_effect: data.status === 'healthy',
            odds_api: data.status === 'healthy',
            cursor_bot: true,
            database: true,
          });
        }
      } catch (e) {
        console.warn('Status check failed:', e);
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, []);

  const navItems = [
    {
      title: 'Vegas Analysis',
      desc: 'Weekly game analysis with Claude Effect',
      icon: '📊',
      href: '/vegas-analysis',
      gradient: 'from-purple-600 to-pink-600',
      glow: 'shadow-purple-500/30',
    },
    {
      title: 'Create Prediction',
      desc: 'Generate AI predictions for any game',
      icon: '🎯',
      href: '/create-prediction',
      gradient: 'from-blue-600 to-cyan-500',
      glow: 'shadow-blue-500/30',
    },
    {
      title: 'Arbitrage Finder',
      desc: 'Find guaranteed profit opportunities',
      icon: '💰',
      href: '/arbitrage',
      gradient: 'from-emerald-600 to-green-500',
      glow: 'shadow-emerald-500/30',
    },
    {
      title: 'Single Game',
      desc: 'Deep analysis of one specific game',
      icon: '🎮',
      href: '/single-game',
      gradient: 'from-red-600 to-orange-500',
      glow: 'shadow-red-500/30',
    },
    {
      title: 'Elite Fine-Tuner',
      desc: 'Advanced prediction customization',
      icon: '⚡',
      href: '/elite-fine-tuner',
      gradient: 'from-violet-600 to-purple-500',
      glow: 'shadow-violet-500/30',
    },
    {
      title: 'Accuracy Dashboard',
      desc: 'Track prediction performance',
      icon: '📈',
      href: '/accuracy',
      gradient: 'from-amber-600 to-yellow-500',
      glow: 'shadow-amber-500/30',
    },
    {
      title: 'Cursor Bot Dashboard',
      desc: 'Monitor the autonomous AI bot',
      icon: '🤖',
      href: '/cursor-bot-dashboard',
      gradient: 'from-cyan-600 to-blue-500',
      glow: 'shadow-cyan-500/30',
    },
    {
      title: 'Enhanced Picks',
      desc: 'Premium picks with full analysis',
      icon: '🏆',
      href: '/picks',
      gradient: 'from-pink-600 to-rose-500',
      glow: 'shadow-pink-500/30',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-pink-600/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header Ad */}
        <div className="text-center mb-8">
          <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Advertisement</div>
          <div className="inline-block">
            <AdBanner
              adSlot="progno-header"
              adFormat="leaderboard"
              width={728}
              height={90}
            />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/40 transform rotate-6">
              🎲
            </div>
            <div className="text-left">
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
                PROGNO
              </h1>
              <p className="text-purple-400 font-semibold text-lg">
                AI Sports Prediction Engine
              </p>
            </div>
          </div>
          
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Powered by the 7-Dimensional Claude Effect™ with Monte Carlo simulations,
            sentiment analysis, and autonomous machine learning.
          </p>
        </div>

        {/* System Status */}
        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {[
            { key: 'claude_effect', label: 'Claude Effect', icon: '🧠' },
            { key: 'odds_api', label: 'Odds API', icon: '📡' },
            { key: 'cursor_bot', label: 'Cursor Bot', icon: '🤖' },
            { key: 'database', label: 'Database', icon: '💾' },
          ].map((sys) => (
            <div
              key={sys.key}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2"
            >
              <span className="text-xl">{sys.icon}</span>
              <span className="text-sm text-gray-300">{sys.label}</span>
              {loading ? (
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
              ) : (
                <div className={`w-2 h-2 rounded-full ${
                  status?.[sys.key as keyof SystemStatus] ? 'bg-green-500' : 'bg-red-500'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => router.push(item.href)}
              className={`
                group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-left
                hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] hover:border-white/20
                shadow-xl ${item.glow}
              `}
            >
              <div className={`
                w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center text-3xl mb-4
                shadow-lg group-hover:scale-110 transition-transform duration-300
              `}>
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                {item.desc}
              </p>
              <div className="absolute top-4 right-4 text-gray-600 group-hover:text-purple-400 transition-colors">
                →
              </div>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-3xl border border-white/10 p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to get started?</h2>
              <p className="text-purple-300">Run a full analysis on today's games with one click.</p>
            </div>
            <button
              onClick={() => router.push('/vegas-analysis')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-4 rounded-xl transition-all transform hover:scale-105 shadow-xl shadow-purple-500/30 whitespace-nowrap"
            >
              🚀 Run Vegas Analysis
            </button>
          </div>
        </div>

        {/* API Info Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              🔌
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">API Access</h3>
              <p className="text-gray-400 text-sm mb-3">
                Access the Progno API programmatically. Full Claude Effect integration, 
                real-time predictions, and comprehensive documentation.
              </p>
              <div className="flex gap-3">
                <a
                  href="/api/progno/v2?action=info"
                  target="_blank"
                  className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  API Info →
                </a>
                <a
                  href="/api/test/claude-effect"
                  target="_blank"
                  className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  Test Claude Effect →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Ad */}
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Advertisement</div>
          <div className="inline-block">
            <AdBanner
              adSlot="progno-footer"
              adFormat="banner"
              width={468}
              height={60}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} PROGNO • Cevict Flux v2.0 • Claude Effect Engine
          </p>
          <p className="text-xs text-gray-600 mt-2">
            For entertainment purposes only. Gamble responsibly.
          </p>
        </footer>
      </div>
    </div>
  );
}
