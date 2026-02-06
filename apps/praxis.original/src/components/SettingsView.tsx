'use client';

import { useState } from 'react';
import { 
  Settings, Key, Bell, Palette, Database, Shield, 
  ExternalLink, Check, AlertTriangle, Loader2, 
  RefreshCw, Trash2, Download, Upload, Moon, Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsViewProps {
  onSave: (settings: AppSettings) => void;
  initialSettings?: AppSettings;
}

export interface AppSettings {
  kalshiApiKey: string;
  kalshiApiSecret: string;
  polymarketWallet: string;
  anthropicApiKey: string;
  alertEmail: string;
  alertSms: string;
  alertThresholds: {
    drawdownPct: number;
    profitTarget: number;
    newArbitrage: boolean;
  };
  display: {
    theme: 'dark' | 'light';
    compactMode: boolean;
    showPnLInHeader: boolean;
  };
  trading: {
    defaultPositionSize: number;
    maxPositionSize: number;
    useKellyFraction: boolean;
    kellyMultiplier: number;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  kalshiApiKey: '',
  kalshiApiSecret: '',
  polymarketWallet: '',
  anthropicApiKey: '',
  alertEmail: '',
  alertSms: '',
  alertThresholds: {
    drawdownPct: 10,
    profitTarget: 500,
    newArbitrage: true,
  },
  display: {
    theme: 'dark',
    compactMode: false,
    showPnLInHeader: true,
  },
  trading: {
    defaultPositionSize: 25,
    maxPositionSize: 100,
    useKellyFraction: true,
    kellyMultiplier: 0.5,
  },
};

// Connection Test Status
type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

function ConnectionCard({
  title,
  description,
  icon: Icon,
  connected,
  onTest,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  connected: boolean;
  onTest: () => Promise<boolean>;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  
  const handleTest = async () => {
    setStatus('testing');
    const success = await onTest();
    setStatus(success ? 'success' : 'error');
    setTimeout(() => setStatus('idle'), 3000);
  };
  
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            connected ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'
          )}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-zinc-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
              Connected
            </span>
          )}
        </div>
      </div>
      
      {children}
      
      <button
        onClick={handleTest}
        disabled={status === 'testing'}
        className="mt-4 w-full btn-secondary flex items-center justify-center gap-2"
      >
        {status === 'testing' ? (
          <>
            <Loader2 className="animate-spin" size={14} />
            Testing...
          </>
        ) : status === 'success' ? (
          <>
            <Check className="text-green-400" size={14} />
            Connected!
          </>
        ) : status === 'error' ? (
          <>
            <AlertTriangle className="text-red-400" size={14} />
            Connection Failed
          </>
        ) : (
          <>
            <RefreshCw size={14} />
            Test Connection
          </>
        )}
      </button>
    </div>
  );
}

// Settings Section
function SettingsSection({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
        <Icon className="text-indigo-400" size={20} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Toggle Switch
function Toggle({ 
  enabled, 
  onChange, 
  label 
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          'w-12 h-6 rounded-full transition-all p-0.5',
          enabled ? 'bg-indigo-600' : 'bg-zinc-700'
        )}
      >
        <div className={cn(
          'w-5 h-5 rounded-full bg-white transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-0'
        )} />
      </button>
    </div>
  );
}

export default function SettingsView({ onSave, initialSettings }: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings || DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  
  const updateSettings = <K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    // Save to localStorage
    localStorage.setItem('praxis-settings', JSON.stringify(settings));
    onSave(settings);
    await new Promise(r => setTimeout(r, 500));
    setIsSaving(false);
  };
  
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'praxis-settings.json';
    a.click();
  };
  
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings(imported);
        } catch (err) {
          alert('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-zinc-500">Configure your trading platform</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={14} />
            Export
          </button>
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload size={14} />
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Save Settings
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Connections */}
        <ConnectionCard
          title="Kalshi API"
          description="Connect to Kalshi for live trading"
          icon={Key}
          connected={!!settings.kalshiApiKey}
          onTest={async () => {
            if (!settings.kalshiApiKey) return false;
            // Simulate API test
            await new Promise(r => setTimeout(r, 1000));
            return true;
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-sm text-zinc-400 block mb-1">API Key</label>
              <input
                type="password"
                value={settings.kalshiApiKey}
                onChange={(e) => updateSettings('kalshiApiKey', e.target.value)}
                placeholder="Enter your Kalshi API key"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1">API Secret</label>
              <input
                type="password"
                value={settings.kalshiApiSecret}
                onChange={(e) => updateSettings('kalshiApiSecret', e.target.value)}
                placeholder="Enter your Kalshi API secret"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <a 
              href="https://kalshi.com/settings/api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              Get API keys from Kalshi <ExternalLink size={10} />
            </a>
          </div>
        </ConnectionCard>
        
        <ConnectionCard
          title="Polymarket"
          description="Connect your wallet for Polymarket"
          icon={Database}
          connected={!!settings.polymarketWallet}
          onTest={async () => {
            if (!settings.polymarketWallet) return false;
            await new Promise(r => setTimeout(r, 1000));
            return settings.polymarketWallet.startsWith('0x');
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Wallet Address</label>
              <input
                type="text"
                value={settings.polymarketWallet}
                onChange={(e) => updateSettings('polymarketWallet', e.target.value)}
                placeholder="0x..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Connect your Polygon wallet to access Polymarket data
            </p>
          </div>
        </ConnectionCard>
        
        <ConnectionCard
          title="Claude AI"
          description="Power AI insights with Anthropic"
          icon={Shield}
          connected={!!settings.anthropicApiKey}
          onTest={async () => {
            if (!settings.anthropicApiKey) return false;
            await new Promise(r => setTimeout(r, 1000));
            return settings.anthropicApiKey.startsWith('sk-ant-');
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Anthropic API Key</label>
              <input
                type="password"
                value={settings.anthropicApiKey}
                onChange={(e) => updateSettings('anthropicApiKey', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <a 
              href="https://console.anthropic.com/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              Get API key from Anthropic <ExternalLink size={10} />
            </a>
          </div>
        </ConnectionCard>
        
        {/* Alerts */}
        <SettingsSection title="Alerts & Notifications" icon={Bell}>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Email for Alerts</label>
              <input
                type="email"
                value={settings.alertEmail}
                onChange={(e) => updateSettings('alertEmail', e.target.value)}
                placeholder="you@email.com"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Phone for SMS</label>
              <input
                type="tel"
                value={settings.alertSms}
                onChange={(e) => updateSettings('alertSms', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div>
                <label className="text-sm text-zinc-400 block mb-1">
                  Alert on Drawdown (%)
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.drawdownPct}
                  onChange={(e) => updateSettings('alertThresholds', { 
                    ...settings.alertThresholds, 
                    drawdownPct: parseInt(e.target.value) 
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-1">
                  Alert on Profit Target ($)
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.profitTarget}
                  onChange={(e) => updateSettings('alertThresholds', { 
                    ...settings.alertThresholds, 
                    profitTarget: parseInt(e.target.value) 
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <Toggle
                label="Alert on new arbitrage opportunities"
                enabled={settings.alertThresholds.newArbitrage}
                onChange={(v) => updateSettings('alertThresholds', { 
                  ...settings.alertThresholds, 
                  newArbitrage: v 
                })}
              />
            </div>
          </div>
        </SettingsSection>
        
        {/* Display */}
        <SettingsSection title="Display" icon={Palette}>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-2">Theme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings('display', { ...settings.display, theme: 'dark' })}
                  className={cn(
                    'flex-1 p-3 rounded-lg flex items-center justify-center gap-2 transition-all',
                    settings.display.theme === 'dark' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  )}
                >
                  <Moon size={16} />
                  Dark
                </button>
                <button
                  onClick={() => updateSettings('display', { ...settings.display, theme: 'light' })}
                  className={cn(
                    'flex-1 p-3 rounded-lg flex items-center justify-center gap-2 transition-all',
                    settings.display.theme === 'light' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  )}
                >
                  <Sun size={16} />
                  Light
                </button>
              </div>
            </div>
            <Toggle
              label="Compact mode"
              enabled={settings.display.compactMode}
              onChange={(v) => updateSettings('display', { ...settings.display, compactMode: v })}
            />
            <Toggle
              label="Show P&L in header"
              enabled={settings.display.showPnLInHeader}
              onChange={(v) => updateSettings('display', { ...settings.display, showPnLInHeader: v })}
            />
          </div>
        </SettingsSection>
        
        {/* Trading */}
        <SettingsSection title="Trading Defaults" icon={Settings}>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Default Position Size ($)</label>
              <input
                type="number"
                value={settings.trading.defaultPositionSize}
                onChange={(e) => updateSettings('trading', { 
                  ...settings.trading, 
                  defaultPositionSize: parseInt(e.target.value) 
                })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Max Position Size ($)</label>
              <input
                type="number"
                value={settings.trading.maxPositionSize}
                onChange={(e) => updateSettings('trading', { 
                  ...settings.trading, 
                  maxPositionSize: parseInt(e.target.value) 
                })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <Toggle
              label="Use Kelly Criterion for sizing"
              enabled={settings.trading.useKellyFraction}
              onChange={(v) => updateSettings('trading', { ...settings.trading, useKellyFraction: v })}
            />
            {settings.trading.useKellyFraction && (
              <div>
                <label className="text-sm text-zinc-400 block mb-1">
                  Kelly Multiplier ({(settings.trading.kellyMultiplier * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.trading.kellyMultiplier}
                  onChange={(e) => updateSettings('trading', { 
                    ...settings.trading, 
                    kellyMultiplier: parseFloat(e.target.value) 
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Conservative (10%)</span>
                  <span>Full Kelly (100%)</span>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>
      </div>
      
      {/* Danger Zone */}
      <div className="card border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="text-red-400" size={20} />
          <h3 className="font-semibold text-red-400">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Reset all data</p>
            <p className="text-xs text-zinc-500">Clear all trades, settings, and preferences</p>
          </div>
          <button 
            onClick={() => {
              if (confirm('Are you sure? This will delete all your data.')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
          >
            Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
}
