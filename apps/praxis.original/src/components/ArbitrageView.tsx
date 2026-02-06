'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  Clock,
  Filter,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Bell,
  Target,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { useTradingStore } from '@/lib/store';

interface ArbitrageOpportunity {
  id: string;
  title: string;
  platform1: 'kalshi' | 'polymarket' | 'coinbase';
  platform2: 'kalshi' | 'polymarket' | 'coinbase';
  price1: number; // YES price on platform 1
  price2: number; // NO price on platform 2 (should sum > 1 for arb)
  spread: number; // The guaranteed profit margin
  profit: number; // Expected profit per $100
  volume1: number;
  volume2: number;
  liquidity: 'high' | 'medium' | 'low';
  expiresIn: string;
  category: string;
  risk: 'low' | 'medium' | 'high';
  url1?: string;
  url2?: string;
  timestamp: Date;
}

interface ArbitrageScannerProps {
  kalshiApiKey?: string;
  polymarketConnected?: boolean;
}

// Platform colors
const PLATFORM_COLORS = {
  kalshi: 'bg-blue-500',
  polymarket: 'bg-purple-500',
  coinbase: 'bg-green-500',
};

const PLATFORM_NAMES = {
  kalshi: 'Kalshi',
  polymarket: 'Polymarket',
  coinbase: 'Coinbase',
};

// Arbitrage Card Component
function ArbitrageCard({ opp, onExecute }: { opp: ArbitrageOpportunity; onExecute: () => void }) {
  return (
    <div className="card hover:border-indigo-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs px-2 py-0.5 rounded-full',
              opp.risk === 'low' ? 'bg-green-500/20 text-green-400' :
                opp.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
            )}>
              {opp.risk.toUpperCase()} RISK
            </span>
            <span className="text-xs text-zinc-500">{opp.category}</span>
          </div>
          <h4 className="font-medium text-sm">{opp.title}</h4>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-green-400">
            {opp.profit > 0 && opp.profit < 99 ? `+${opp.profit.toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs text-zinc-500">per $100</p>
        </div>
      </div>

      {/* Platform Comparison */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-zinc-800/50 rounded-lg">
        <div className="flex-1 text-center">
          <div className={cn('w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white', PLATFORM_COLORS[opp.platform1])}>
            {PLATFORM_NAMES[opp.platform1].charAt(0)}
          </div>
          <p className="text-xs text-zinc-500">YES</p>
          <p className="font-bold">{opp.price1 > 0 ? formatCurrency(opp.price1, 2) : '—'}</p>
        </div>

        <ArrowRight className="text-zinc-600" size={16} />

        <div className="flex-1 text-center">
          <div className={cn('w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white', PLATFORM_COLORS[opp.platform2])}>
            {PLATFORM_NAMES[opp.platform2].charAt(0)}
          </div>
          <p className="text-xs text-zinc-500">NO</p>
          <p className="font-bold">{opp.price2 > 0 ? formatCurrency(opp.price2, 2) : '—'}</p>
        </div>

        <div className="flex-1 text-center border-l border-zinc-700 pl-3">
          <p className="text-xs text-zinc-500">Spread</p>
          <p className="font-bold text-green-400">{opp.spread > 0 && opp.spread < 1 ? formatCurrency(opp.spread, 2) : opp.profit < 99 ? `${opp.profit.toFixed(1)}%` : '—'}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>Expires: {opp.expiresIn}</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign size={12} />
          <span>Vol: ${((opp.volume1 + opp.volume2) / 1000).toFixed(0)}k</span>
        </div>
        <div className={cn(
          'flex items-center gap-1',
          opp.liquidity === 'high' ? 'text-green-400' :
            opp.liquidity === 'medium' ? 'text-yellow-400' : 'text-red-400'
        )}>
          <Target size={12} />
          <span>{opp.liquidity} liq</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onExecute}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          <Zap size={14} />
          Execute Arb
        </button>
        <button className="btn-secondary p-2">
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}

// What-If Calculator
function WhatIfCalculator() {
  const [yesPrice, setYesPrice] = useState(0.45);
  const [noPrice, setNoPrice] = useState(0.52);
  const [amount, setAmount] = useState(100);

  const totalCost = yesPrice + noPrice;
  const isArbitrage = totalCost < 1;
  const profit = isArbitrage ? (1 - totalCost) * amount : 0;
  const profitPct = isArbitrage ? (1 - totalCost) * 100 : 0;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-indigo-400" size={20} />
        <h3 className="font-semibold">What-If Calculator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-1">YES Price (Platform 1)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={yesPrice}
            onChange={(e) => setYesPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1">NO Price (Platform 2)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={noPrice}
            onChange={(e) => setNoPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1">Investment Amount ($)</label>
          <input
            type="number"
            step="10"
            min="1"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className={cn(
          'p-4 rounded-lg text-center',
          isArbitrage ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
        )}>
          {isArbitrage ? (
            <>
              <CheckCircle className="mx-auto mb-2 text-green-400" size={24} />
              <p className="text-green-400 font-bold text-lg">ARBITRAGE EXISTS</p>
              <p className="text-2xl font-bold text-green-400 mt-2">
                +${profit.toFixed(2)} ({profitPct.toFixed(1)}%)
              </p>
              <p className="text-xs text-zinc-500 mt-1">Guaranteed profit on ${amount}</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-2 text-red-400" size={24} />
              <p className="text-red-400 font-bold">NO ARBITRAGE</p>
              <p className="text-sm text-zinc-400 mt-2">
                Combined cost: ${totalCost.toFixed(2)} (need &lt; $1.00)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Scanner Settings
function ScannerSettings({
  settings,
  onUpdate
}: {
  settings: ScannerSettingsType;
  onUpdate: (settings: ScannerSettingsType) => void;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="text-indigo-400" size={20} />
        <h3 className="font-semibold">Scanner Settings</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-1">Min Spread (%)</label>
          <input
            type="number"
            step="0.1"
            value={settings.minSpread}
            onChange={(e) => onUpdate({ ...settings, minSpread: parseFloat(e.target.value) })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1">Min Liquidity ($)</label>
          <input
            type="number"
            step="1000"
            value={settings.minLiquidity}
            onChange={(e) => onUpdate({ ...settings, minLiquidity: parseFloat(e.target.value) })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-2">Categories</label>
          <div className="flex flex-wrap gap-2">
            {['Crypto', 'Sports', 'Politics', 'Economics', 'Other'].map(cat => (
              <button
                key={cat}
                onClick={() => {
                  const categories = settings.categories.includes(cat)
                    ? settings.categories.filter(c => c !== cat)
                    : [...settings.categories, cat];
                  onUpdate({ ...settings, categories });
                }}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs transition-all',
                  settings.categories.includes(cat)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Alert on new opportunities</span>
          <button
            onClick={() => onUpdate({ ...settings, alertsEnabled: !settings.alertsEnabled })}
            className={cn(
              'w-12 h-6 rounded-full transition-all',
              settings.alertsEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded-full bg-white transition-transform',
              settings.alertsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            )} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ScannerSettingsType {
  minSpread: number;
  minLiquidity: number;
  categories: string[];
  alertsEnabled: boolean;
}

// Main Arbitrage View
export default function ArbitrageView({ kalshiApiKey, polymarketConnected }: ArbitrageScannerProps) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [settings, setSettings] = useState<ScannerSettingsType>({
    minSpread: 0.5,
    minLiquidity: 0,
    categories: ['Crypto', 'Sports', 'Politics', 'Economics', 'Other'],
    alertsEnabled: true,
  });

  const scanForArbitrage = useCallback(async () => {
    setIsScanning(true);

    try {
      // Call our arbitrage scanner API
      const response = await fetch(`/api/arbitrage?minSpread=${settings.minSpread}&minLiquidity=${settings.minLiquidity}`);
      const data = await response.json();

      // Transform API response to our format
      const newOpportunities: ArbitrageOpportunity[] = [];

      // Add cross-platform opportunities
      if (data.crossPlatform) {
        for (const opp of data.crossPlatform) {
          newOpportunities.push({
            id: opp.id,
            title: opp.title,
            platform1: opp.platform1.name,
            platform2: opp.platform2.name,
            price1: opp.platform1.yesPrice,
            price2: opp.platform2.noPrice,
            spread: opp.spread,
            profit: opp.profitPercent,
            volume1: opp.platform1.market?.volume24h || 0,
            volume2: opp.platform2.market?.volume24h || 0,
            liquidity: opp.totalLiquidity > 50000 ? 'high' : opp.totalLiquidity > 10000 ? 'medium' : 'low',
            expiresIn: formatTimeUntil(opp.expiresAt),
            category: opp.platform1.market?.category || 'Other',
            risk: opp.riskLevel || 'medium',
            timestamp: new Date(opp.discoveredAt),
          });
        }
      }

      // Add single-platform Kalshi opportunities
      if (data.singlePlatform?.kalshi) {
        for (const opp of data.singlePlatform.kalshi.slice(0, 5)) {
          newOpportunities.push({
            id: `kalshi-${opp.market.id}`,
            title: opp.market.title,
            platform1: 'kalshi',
            platform2: 'kalshi',
            price1: opp.market.yesPrice,
            price2: opp.market.noPrice,
            spread: opp.spread,
            profit: opp.profitPercent,
            volume1: opp.market.volume24h || 0,
            volume2: 0,
            liquidity: opp.market.liquidity > 50000 ? 'high' : opp.market.liquidity > 10000 ? 'medium' : 'low',
            expiresIn: formatTimeUntil(opp.market.closeTime),
            category: opp.market.category || 'Other',
            risk: 'low',
            timestamp: new Date(),
          });
        }
      }

      // Add single-platform Polymarket opportunities
      if (data.singlePlatform?.polymarket) {
        for (const opp of data.singlePlatform.polymarket.slice(0, 5)) {
          newOpportunities.push({
            id: `poly-${opp.market.id}`,
            title: opp.market.title,
            platform1: 'polymarket',
            platform2: 'polymarket',
            price1: opp.market.yesPrice,
            price2: opp.market.noPrice,
            spread: opp.spread,
            profit: opp.profitPercent,
            volume1: opp.market.volume24h || 0,
            volume2: 0,
            liquidity: opp.market.liquidity > 50000 ? 'high' : opp.market.liquidity > 10000 ? 'medium' : 'low',
            expiresIn: formatTimeUntil(opp.market.closeTime),
            category: opp.market.category || 'Other',
            risk: 'low',
            timestamp: new Date(),
          });
        }
      }

      // Drop opportunities with no real prices (API can return 0/0)
      const valid = newOpportunities.filter(
        (o) => (o.price1 > 0 || o.price2 > 0) && o.profit < 99
      );
      setOpportunities(valid);
      setLastScan(new Date());
      if (valid.length > 0) {
        useTradingStore.getState().addAlert({
          id: `arb-${Date.now()}`,
          type: 'arbitrage',
          priority: 'medium',
          title: 'New arbitrage opportunities',
          message: `Scanner found ${valid.length} opportunity(ies). Check the Arbitrage view.`,
          triggered_at: new Date(),
          acknowledged: false,
        });
      }
    } catch (error) {
      console.error('Arbitrage scan failed:', error);
      // Keep existing opportunities on error
    } finally {
      setIsScanning(false);
    }
  }, [settings.minSpread, settings.minLiquidity]);

  // Helper to format time until expiration
  function formatTimeUntil(dateStr: string): string {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Soon';
  }

  // Auto-scan on mount
  useEffect(() => {
    scanForArbitrage();
  }, [scanForArbitrage]);

  const filteredOpportunities = opportunities.filter(opp =>
    opp.profit >= settings.minSpread &&
    (opp.volume1 + opp.volume2) >= settings.minLiquidity &&
    settings.categories.includes(opp.category)
  );

  const handleExecute = (opp: ArbitrageOpportunity) => {
    // In real implementation, this would:
    // 1. Place YES order on platform 1
    // 2. Place NO order on platform 2
    // 3. Monitor for fills
    console.log('Executing arbitrage:', opp);
    alert(`Would execute arb on ${opp.title}\nBuy YES @ ${opp.price1} on ${opp.platform1}\nBuy NO @ ${opp.price2} on ${opp.platform2}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Arbitrage Scanner</h2>
          <p className="text-zinc-500">Cross-platform arbitrage opportunities</p>
        </div>
        <button
          onClick={scanForArbitrage}
          disabled={isScanning}
          className="btn-primary flex items-center gap-2"
        >
          {isScanning ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          {isScanning ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', kalshiApiKey ? 'bg-green-500' : 'bg-red-500')} />
          <span className="text-sm">Kalshi {kalshiApiKey ? 'Connected' : 'Not Connected'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', polymarketConnected ? 'bg-green-500' : 'bg-yellow-500')} />
          <span className="text-sm">Polymarket {polymarketConnected ? 'Connected' : 'Ready'}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Clock size={14} className="text-zinc-500" />
          <span className="text-sm text-zinc-500">
            Last scan: {lastScan ? lastScan.toLocaleTimeString() : 'Never'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Opportunities List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{filteredOpportunities.length} Opportunities Found</h3>
            <div className="flex items-center gap-2">
              <button className="btn-secondary text-sm flex items-center gap-1">
                <Filter size={14} />
                Filter
              </button>
            </div>
          </div>

          {filteredOpportunities.length === 0 ? (
            <div className="card text-center py-12">
              <AlertTriangle className="mx-auto mb-3 text-yellow-400" size={32} />
              <p className="text-zinc-400">No arbitrage opportunities match your criteria</p>
              <p className="text-sm text-zinc-500 mt-1">Try adjusting your filters or wait for new opportunities</p>
              {!kalshiApiKey && (
                <p className="text-sm text-zinc-500 mt-2">Add your <strong>Kalshi API key</strong> in Settings for live market data.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOpportunities.map(opp => (
                <ArbitrageCard
                  key={opp.id}
                  opp={opp}
                  onExecute={() => handleExecute(opp)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WhatIfCalculator />
          <ScannerSettings settings={settings} onUpdate={setSettings} />
        </div>
      </div>
    </div>
  );
}
