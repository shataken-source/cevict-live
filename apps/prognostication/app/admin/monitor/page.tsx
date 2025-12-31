'use client';

import { useState, useEffect } from 'react';

interface BotMetric {
  bot_category: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  total_pnl: number;
  avg_edge: number;
  avg_confidence: number;
  last_updated: string;
}

interface BotConfig {
  minConfidence: number;
  maxTradeSize: number;
  minEdge: number;
  dailyLossLimit: number;
  dailySpendingLimit: number;
  maxOpenPositions: number;
}

export default function AdminMonitorPage() {
  const [botStatus, setBotStatus] = useState<any>(null);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editedConfig, setEditedConfig] = useState<BotConfig | null>(null);

  // Fetch bot status and config
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch bot status
      const statusRes = await fetch('/api/admin/bot-status');
      const statusData = await statusRes.json();
      
      // Fetch bot config
      const configRes = await fetch('/api/admin/bot-config');
      const configData = await configRes.json();
      
      if (statusData.success) {
        setBotStatus(statusData);
      }
      
      if (configData.success) {
        setBotConfig(configData.config);
        setEditedConfig(configData.config);
      }
      
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update bot configuration
  const updateConfig = async () => {
    if (!editedConfig) return;
    
    try {
      setUpdating(true);
      const res = await fetch('/api/admin/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedConfig),
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('Configuration updated! Bot restart required.');
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !botStatus) {
    return (
      <div className="min-h-screen bg-black text-green-500 p-8 font-mono">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl mb-8">⏳ Loading Bot Monitor...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-500 p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-cyan-400">◉</span> BOT MONITORING DASHBOARD
          </h1>
          <div className="text-sm">
            <span className="text-green-700">Last Updated:</span>
            <span className="text-green-400 ml-2">
              {botStatus?.timestamp ? new Date(botStatus.timestamp).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-500 p-4 rounded mb-6">
            <span className="text-red-400">❌ Error: {error}</span>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-950/20 border border-green-900 rounded p-4">
            <div className="text-green-700 text-xs mb-1">TOTAL PREDICTIONS</div>
            <div className="text-2xl font-bold text-green-400">
              {botStatus?.summary?.totalPredictions || 0}
            </div>
          </div>
          
          <div className="bg-green-950/20 border border-green-900 rounded p-4">
            <div className="text-green-700 text-xs mb-1">OVERALL ACCURACY</div>
            <div className="text-2xl font-bold text-cyan-400">
              {botStatus?.summary?.overallAccuracy || 0}%
            </div>
          </div>
          
          <div className="bg-green-950/20 border border-green-900 rounded p-4">
            <div className="text-green-700 text-xs mb-1">TOTAL P&L</div>
            <div className={`text-2xl font-bold ${(botStatus?.summary?.totalPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${botStatus?.summary?.totalPnl?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="bg-green-950/20 border border-green-900 rounded p-4">
            <div className="text-green-700 text-xs mb-1">OPEN TRADES</div>
            <div className="text-2xl font-bold text-yellow-400">
              {botStatus?.summary?.openTrades || 0}
            </div>
          </div>
        </div>

        {/* Bot Configuration Controls */}
        <div className="bg-green-950/20 border border-green-900 rounded p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-cyan-400">⚙️ BOT CONFIGURATION</h2>
          
          {botConfig && editedConfig && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-green-700 text-xs mb-1">MIN CONFIDENCE (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editedConfig.minConfidence}
                  onChange={(e) => setEditedConfig({ ...editedConfig, minConfidence: parseInt(e.target.value) })}
                  className="w-full bg-black border border-green-900 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-green-700 text-xs mb-1">MAX TRADE SIZE ($)</label>
                <input
                  type="number"
                  min="1"
                  value={editedConfig.maxTradeSize}
                  onChange={(e) => setEditedConfig({ ...editedConfig, maxTradeSize: parseInt(e.target.value) })}
                  className="w-full bg-black border border-green-900 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-green-700 text-xs mb-1">MIN EDGE (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={editedConfig.minEdge}
                  onChange={(e) => setEditedConfig({ ...editedConfig, minEdge: parseFloat(e.target.value) })}
                  className="w-full bg-black border border-green-900 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-green-700 text-xs mb-1">DAILY LOSS LIMIT ($)</label>
                <input
                  type="number"
                  min="1"
                  value={editedConfig.dailyLossLimit}
                  onChange={(e) => setEditedConfig({ ...editedConfig, dailyLossLimit: parseInt(e.target.value) })}
                  className="w-full bg-black border border-green-900 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-green-700 text-xs mb-1">DAILY SPENDING LIMIT ($)</label>
                <input
                  type="number"
                  min="1"
                  value={editedConfig.dailySpendingLimit}
                  onChange={(e) => setEditedConfig({ ...editedConfig, dailySpendingLimit: parseInt(e.target.value) })}
                  className="w-full bg-black border border-green-900 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-green-700 text-xs mb-1">MAX OPEN POSITIONS</label>
                <input
                  type="number"
                  min="1"
                  value={editedConfig.maxOpenPositions}
                  onChange={(e) => setEditedConfig({ ...editedConfig, maxOpenPositions: parseInt(e.target.value) })}
                  className="w-full bg-black border border-green-900 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
          )}
          
          <button
            onClick={updateConfig}
            disabled={updating}
            className="mt-4 bg-gradient-to-r from-green-600 to-cyan-600 text-black font-bold px-6 py-2 rounded hover:from-green-500 hover:to-cyan-500 transition-all disabled:opacity-50"
          >
            {updating ? '⏳ UPDATING...' : '💾 UPDATE CONFIG'}
          </button>
          
          <p className="text-xs text-green-700 mt-2">
            ⚠️ Bot restart required for changes to take effect
          </p>
        </div>

        {/* Bot Performance by Category */}
        <div className="bg-green-950/20 border border-green-900 rounded p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-cyan-400">📊 BOT PERFORMANCE BY CATEGORY</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-green-900">
                  <th className="text-left py-2 text-green-700">CATEGORY</th>
                  <th className="text-right py-2 text-green-700">PREDICTIONS</th>
                  <th className="text-right py-2 text-green-700">ACCURACY</th>
                  <th className="text-right py-2 text-green-700">AVG EDGE</th>
                  <th className="text-right py-2 text-green-700">AVG CONF</th>
                  <th className="text-right py-2 text-green-700">P&L</th>
                </tr>
              </thead>
              <tbody>
                {(botStatus?.botMetrics || []).map((bot: BotMetric) => (
                  <tr key={bot.bot_category} className="border-b border-green-900/50">
                    <td className="py-2 text-cyan-400">{bot.bot_category.toUpperCase()}</td>
                    <td className="text-right text-green-400">{bot.total_predictions}</td>
                    <td className="text-right text-green-400">{bot.accuracy.toFixed(1)}%</td>
                    <td className="text-right text-green-400">{bot.avg_edge.toFixed(1)}%</td>
                    <td className="text-right text-green-400">{bot.avg_confidence.toFixed(1)}%</td>
                    <td className={`text-right ${bot.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${bot.total_pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(!botStatus?.botMetrics || botStatus.botMetrics.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-green-700">
                      No bot metrics available yet. Waiting for predictions...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Predictions */}
        <div className="bg-green-950/20 border border-green-900 rounded p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-cyan-400">📋 RECENT PREDICTIONS (Last 24h)</h2>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(botStatus?.recentPredictions || []).slice(0, 10).map((pred: any) => (
              <div key={pred.id} className="border border-green-900/50 rounded p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-cyan-400 text-xs">[{pred.bot_category.toUpperCase()}]</span>
                    <span className="text-green-400 ml-2">{pred.market_title}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    pred.actual_outcome === 'win' ? 'bg-green-500/20 text-green-400' :
                    pred.actual_outcome === 'loss' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {pred.actual_outcome?.toUpperCase() || 'PENDING'}
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-green-700">PRED:</span>
                    <span className="text-green-400 ml-1">{pred.prediction.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-green-700">CONF:</span>
                    <span className="text-green-400 ml-1">{pred.confidence}%</span>
                  </div>
                  <div>
                    <span className="text-green-700">EDGE:</span>
                    <span className="text-green-400 ml-1">{pred.edge}%</span>
                  </div>
                  <div>
                    <span className="text-green-700">P&L:</span>
                    <span className={pred.pnl >= 0 ? 'text-green-400 ml-1' : 'text-red-400 ml-1'}>
                      ${pred.pnl?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {(!botStatus?.recentPredictions || botStatus.recentPredictions.length === 0) && (
              <div className="text-center py-8 text-green-700">
                No predictions in last 24 hours. Bot may be analyzing markets...
              </div>
            )}
          </div>
        </div>

        {/* Learning Patterns */}
        <div className="bg-green-950/20 border border-green-900 rounded p-6">
          <h2 className="text-xl font-bold mb-4 text-cyan-400">🧠 TOP LEARNING PATTERNS</h2>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(botStatus?.learningPatterns || []).slice(0, 10).map((pattern: any) => (
              <div key={pattern.id} className="border border-green-900/50 rounded p-3">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-cyan-400 text-xs">[{pattern.bot_category.toUpperCase()}]</span>
                  <span className="text-green-400 text-xs">
                    Success: {pattern.success_rate}% ({pattern.times_observed}x)
                  </span>
                </div>
                <div className="text-green-300 text-sm">
                  {pattern.pattern_description}
                </div>
              </div>
            ))}
            {(!botStatus?.learningPatterns || botStatus.learningPatterns.length === 0) && (
              <div className="text-center py-8 text-green-700">
                No learning patterns yet. Bot is still gathering data...
              </div>
            )}
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-8 text-center text-xs text-green-700">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
          Auto-refreshing every 10 seconds
        </div>
      </div>
    </div>
  );
}

