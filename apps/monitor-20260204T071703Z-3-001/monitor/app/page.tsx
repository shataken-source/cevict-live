'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, Bot, Globe, MessageSquare, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Website {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

interface WebsiteStats {
  websiteId: string;
  uptime: {
    percentage: number;
    latestStatus: string;
    latestResponseTime: number | null;
    latestError: string | null;
  };
  visitors: {
    today: number;
    total: number;
  };
  bots: Array<{
    bot_name: string;
    status: 'running' | 'waiting' | 'broken';
    error_message: string | null;
  }>;
}

export default function MonitorDashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [stats, setStats] = useState<Record<string, WebsiteStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedWebsite, setSelectedWebsite] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWebsites();
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/websites');
        if (res.ok) {
          const data = await res.json();
          const list = data.websites || [];
          setWebsites(list);
          list.forEach((w: Website) => fetchStats(w.id));
        }
      } catch (e) {
        console.error('Error refreshing:', e);
      }
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (websites.length > 0) {
      websites.forEach(w => fetchStats(w.id));
    }
  }, [websites]);

  const fetchWebsites = async () => {
    try {
      const res = await fetch('/api/websites');
      if (res.ok) {
        const data = await res.json();
        setWebsites(data.websites || []);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (websiteId: string) => {
    try {
      const res = await fetch(`/api/monitor/stats?websiteId=${websiteId}&period=week`);
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({ ...prev, [websiteId]: data }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCheckNow = async (websiteId: string, url: string) => {
    setCheckingId(websiteId);
    try {
      const res = await fetch('/api/monitor/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, url }),
      });
      if (res.ok) await fetchStats(websiteId);
    } catch (e) {
      console.error('Check failed:', e);
    } finally {
      setCheckingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      case 'slow': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'up': return 'bg-green-500/20 border-green-500/50';
      case 'down': return 'bg-red-500/20 border-red-500/50';
      case 'slow': return 'bg-yellow-500/20 border-yellow-500/50';
      default: return 'bg-gray-500/20 border-gray-500/50';
    }
  };

  const getBotStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'waiting': return 'bg-yellow-500';
      case 'broken': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4" />
          <div>Loading monitoring dashboard...</div>
        </div>
      </div>
    );
  }

  const websiteStats = selectedWebsite ? stats[selectedWebsite] : undefined;
  const selectedWebsiteData = websites.find(w => w.id === selectedWebsite);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 md:p-8" style={{ fontSize: 'clamp(14px, 1.5vw, 18px)' }}>
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2" style={{ fontSize: 'clamp(2rem, 4vw, 4rem)' }}>
              🌐 Website Monitor
            </h1>
            <p className="text-gray-400 text-sm md:text-base" style={{ fontSize: 'clamp(12px, 1.2vw, 16px)' }}>
              Real-time monitoring dashboard
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/landing"
              className="bg-slate-600 hover:bg-slate-500 px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold text-sm md:text-base"
            >
              About & pricing
            </Link>
            <Link
              href="/command-center"
              className="bg-green-600 hover:bg-green-500 px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold text-sm md:text-base"
            >
              🎛️ Command Center
            </Link>
            <Link
              href="/admin"
              className="bg-blue-600 hover:bg-blue-500 px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold text-sm md:text-base"
            >
              Admin Panel
            </Link>
            <button
              onClick={() => setShowChat(!showChat)}
              className="bg-purple-600 hover:bg-purple-500 px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold flex items-center gap-2 text-sm md:text-base"
            >
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
              AI Chat
            </button>
          </div>
        </div>

        {/* AI Chat Panel */}
        {showChat && (
          <div className="mb-6 bg-slate-800/50 border border-purple-500/30 rounded-xl p-4 md:p-6">
            <AIChatPanel website={selectedWebsiteData} stats={websiteStats} onClose={() => setShowChat(false)} />
          </div>
        )}

        {/* Websites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {websites.map(website => {
            const siteStats = stats[website.id];
            const status = siteStats?.uptime?.latestStatus || 'unknown';
            const uptime = siteStats?.uptime?.percentage || 0;
            const responseTime = siteStats?.uptime?.latestResponseTime;
            const bots = siteStats?.bots || [];

            return (
              <div
                key={website.id}
                onClick={() => setSelectedWebsite(website.id)}
                className={`bg-slate-800/50 border-2 rounded-xl p-4 md:p-6 cursor-pointer transition-all hover:scale-105 ${getStatusBg(status)} ${selectedWebsite === website.id ? 'ring-4 ring-blue-500' : ''}`}
                style={{ minHeight: 'clamp(200px, 20vw, 300px)' }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg md:text-xl mb-1" style={{ fontSize: 'clamp(16px, 2vw, 24px)' }}>
                      {website.name}
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm truncate" style={{ fontSize: 'clamp(10px, 1vw, 14px)' }}>
                      {website.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCheckNow(website.id, website.url); }}
                      disabled={checkingId === website.id}
                      className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                      title="Check now"
                    >
                      <RefreshCw className={`w-4 h-4 ${checkingId === website.id ? 'animate-spin' : ''}`} />
                    </button>
                    <div className={`w-3 h-3 rounded-full ${getBotStatusColor(status === 'up' ? 'running' : status === 'down' ? 'broken' : 'waiting')}`} />
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Uptime */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400 text-xs md:text-sm">Uptime</span>
                      <span className={`font-bold ${getStatusColor(status)}`}>
                        {uptime.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${status === 'up' ? 'bg-green-500' : status === 'down' ? 'bg-red-500' : 'bg-yellow-500'}`}
                        style={{ width: `${uptime}%` }}
                      />
                    </div>
                  </div>

                  {/* Response Time */}
                  {responseTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs md:text-sm">Response</span>
                      <span className="font-semibold">{responseTime}ms</span>
                    </div>
                  )}

                  {/* Visitors */}
                  {siteStats && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs md:text-sm">Visitors Today</span>
                      <span className="font-semibold">{siteStats.visitors.today}</span>
                    </div>
                  )}

                  {/* Bots */}
                  <div className="flex flex-wrap gap-2">
                    {bots.map((bot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded text-xs"
                      >
                        <div className={`w-2 h-2 rounded-full ${getBotStatusColor(bot.status)}`} />
                        <span>{bot.bot_name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center text-blue-400 text-xs md:text-sm">
                  View Details <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                </div>
              </div>
            );
          })}

          {/* Add Website Card */}
          <Link
            href="/admin"
            className="bg-slate-800/30 border-2 border-dashed border-slate-600 rounded-xl p-4 md:p-6 flex items-center justify-center hover:border-blue-500 transition-all min-h-[200px]"
          >
            <div className="text-center">
              <Globe className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 text-gray-400" />
              <div className="text-gray-400 text-sm md:text-base">Add Website</div>
            </div>
          </Link>
        </div>

        {/* Detail View */}
        {selectedWebsite && websiteStats && selectedWebsiteData && (
          <div className="mt-6 md:mt-8 bg-slate-800/50 border border-blue-500/30 rounded-xl p-4 md:p-6">
            <WebsiteDetail
              website={selectedWebsiteData}
              stats={websiteStats}
              onClose={() => setSelectedWebsite(null)}
              onCheckNow={handleCheckNow}
              isChecking={checkingId === selectedWebsite}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function WebsiteDetail({ website, stats, onClose, onCheckNow, isChecking }: {
  website: Website; stats: WebsiteStats; onClose: () => void;
  onCheckNow?: (websiteId: string, url: string) => void | Promise<void>;
  isChecking?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl md:text-3xl font-bold" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
          {website.name} - Details
        </h2>
        <div className="flex gap-2">
          {onCheckNow && (
            <button
              onClick={() => onCheckNow(website.id, website.url)}
              disabled={isChecking}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check now'}
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Uptime Stats */}
        <div className="bg-slate-900/50 rounded-lg p-4 md:p-6">
          <h3 className="font-bold mb-4 text-lg md:text-xl">Uptime Status</h3>
          <div className="space-y-3">
            <div>
              <div className="text-gray-400 text-sm mb-1">Status</div>
              <div className={`text-2xl md:text-3xl font-bold ${stats.uptime.latestStatus === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {stats.uptime.latestStatus.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Uptime</div>
              <div className="text-2xl md:text-3xl font-bold">{stats.uptime.percentage.toFixed(1)}%</div>
            </div>
            {stats.uptime.latestResponseTime && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Response Time</div>
                <div className="text-xl md:text-2xl font-bold">{stats.uptime.latestResponseTime}ms</div>
              </div>
            )}
            {stats.uptime.latestError && (
              <div className="bg-red-900/30 border border-red-500/50 rounded p-3">
                <div className="text-red-400 text-sm">{stats.uptime.latestError}</div>
              </div>
            )}
          </div>
        </div>

        {/* Visitor Stats */}
        <div className="bg-slate-900/50 rounded-lg p-4 md:p-6">
          <h3 className="font-bold mb-4 text-lg md:text-xl">Visitors</h3>
          <div className="space-y-3">
            <div>
              <div className="text-gray-400 text-sm mb-1">Today</div>
              <div className="text-2xl md:text-3xl font-bold">{stats.visitors.today}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">This Week</div>
              <div className="text-xl md:text-2xl font-bold">{stats.visitors.total}</div>
            </div>
          </div>
        </div>

        {/* Bot Status */}
        <div className="bg-slate-900/50 rounded-lg p-4 md:p-6">
          <h3 className="font-bold mb-4 text-lg md:text-xl">Bot Status</h3>
          <div className="space-y-2">
            {stats.bots.length === 0 ? (
              <div className="text-gray-400 text-sm">No bots configured</div>
            ) : (
              stats.bots.map((bot, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${bot.status === 'running' ? 'bg-green-500' : bot.status === 'waiting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <span className="text-sm md:text-base">{bot.bot_name}</span>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{bot.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AIChatPanel({ website, stats, onClose }: { website?: Website; stats?: WebsiteStats; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const context = website && stats ? {
        website: website.name,
        url: website.url,
        status: stats.uptime.latestStatus,
        uptime: stats.uptime.percentage,
        error: stats.uptime.latestError,
        bots: stats.bots,
      } : undefined;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get AI response' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Connection failed' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[400px] md:h-[500px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg md:text-xl">Claude AI Assistant</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto mb-4 space-y-3 bg-slate-900/50 rounded p-4">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm">
            Ask me about website issues, bot problems, or how to fix monitoring errors.
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-gray-400 text-sm">Thinking...</div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about issues or fixes..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

