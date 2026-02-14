'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Activity, Play, Square, RotateCcw, Terminal, MessageSquare, Send, Bot, 
  CheckCircle, XCircle, AlertCircle, RefreshCw, Download, Search, 
  TrendingUp, TrendingDown, DollarSign, BarChart3, Zap, Settings,
  Menu, X, ChevronDown, ChevronUp, Clock, Globe, Server, Sliders
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  icon: string;
  status: 'running' | 'stopped' | 'error';
  health: 'healthy' | 'degraded' | 'down';
  lastCheck: Date | null;
  url?: string;
  port?: number;
  metrics?: {
    trades?: number;
    pnl?: number;
    accuracy?: number;
    uptime?: number;
    predictions?: number;
  };
}

interface ProjectLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

const PROJECTS: Project[] = [
  { id: 'alpha-hunter', name: 'Alpha Hunter', icon: '🤖', status: 'stopped', health: 'down', port: 3001, lastCheck: null },
  { id: 'prognostication', name: 'Prognostication', icon: '🔮', status: 'stopped', health: 'down', port: 3002, lastCheck: null },
  { id: 'orchestrator', name: 'AI Orchestrator', icon: '🎯', status: 'stopped', health: 'down', port: 3333, lastCheck: null },
  { id: 'progno', name: 'PROGNO', icon: '📊', status: 'stopped', health: 'down', port: 3005, lastCheck: null },
  { id: 'petreunion', name: 'PetReunion', icon: '🐾', status: 'stopped', health: 'down', port: 3006, lastCheck: null },
  { id: 'popthepopcorn', name: 'PopThePopcorn', icon: '🍿', status: 'stopped', health: 'down', port: 3007, lastCheck: null },
  { id: 'smokersrights', name: 'SmokersRights', icon: '🚭', status: 'stopped', health: 'down', port: 3008, lastCheck: null },
  { id: 'gulfcoastcharters', name: 'Gulf Coast Charters', icon: '⛵', status: 'stopped', health: 'down', port: 3009, lastCheck: null },
  { id: 'wheretovacation', name: 'WhereToVacation', icon: '✈️', status: 'stopped', health: 'down', port: 3010, lastCheck: null },
];

export default function CommandCenter() {
  const [selectedProject, setSelectedProject] = useState<string>('alpha-hunter');
  const [projects, setProjects] = useState<Record<string, Project>>(
    PROJECTS.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
  );
  const [logs, setLogs] = useState<Record<string, ProjectLog[]>>({});
  const [aiMessage, setAiMessage] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metrics: true,
    controls: true,
    logs: true,
    riskFactors: false,
  });
  const [metrics, setMetrics] = useState<Record<string, Project['metrics']>>({});
  const [riskFactors, setRiskFactors] = useState<Record<string, any>>({});
  const [expandedTraders, setExpandedTraders] = useState<Record<string, boolean>>({});
  const [logFilter, setLogFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [systemHealth, setSystemHealth] = useState<{
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  }>({ total: 0, healthy: 0, degraded: 0, down: 0 });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (expandedSections.logs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, expandedSections.logs]);

  // Auto-refresh status
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      checkAllStatuses();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    checkAllStatuses();
    updateSystemHealth();
    if (selectedProject === 'alpha-hunter') {
      loadRiskFactors();
      loadMetrics();
    }
  }, [selectedProject]);

  // Load metrics
  const loadMetrics = async () => {
    try {
      const res = await fetch(`/api/command-center/metrics?projectId=${selectedProject}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(prev => ({ ...prev, [selectedProject]: data }));
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh || selectedProject !== 'alpha-hunter') return;
    
    const interval = setInterval(() => {
      loadMetrics();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedProject]);

  // Load risk factors
  const loadRiskFactors = async () => {
    try {
      const res = await fetch('/api/command-center/risk-factors');
      if (res.ok) {
        const data = await res.json();
        setRiskFactors(data.factors || {});
      }
    } catch (error) {
      console.error('Failed to load risk factors:', error);
    }
  };

  // Save risk factors
  const saveRiskFactor = async (trader: string, updates: any) => {
    setLoading(prev => ({ ...prev, [`risk-${trader}`]: true }));
    try {
      const current = riskFactors[trader] || {};
      const updated = { ...current, ...updates, trader };
      
      const res = await fetch('/api/command-center/risk-factors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        setRiskFactors(prev => ({ ...prev, [trader]: updated }));
        addLog('alpha-hunter', 'success', `Risk factors updated for ${trader}`);
      } else {
        addLog('alpha-hunter', 'error', `Failed to update risk factors for ${trader}`);
      }
    } catch (error) {
      addLog('alpha-hunter', 'error', `Error updating risk factors: ${error}`);
    } finally {
      setLoading(prev => ({ ...prev, [`risk-${trader}`]: false }));
    }
  };

  const checkAllStatuses = async () => {
    await Promise.all(PROJECTS.map(p => checkProjectStatus(p.id)));
    updateSystemHealth();
  };

  const updateSystemHealth = () => {
    const healthCounts = { total: PROJECTS.length, healthy: 0, degraded: 0, down: 0 };
    Object.values(projects).forEach(p => {
      if (p.health === 'healthy') healthCounts.healthy++;
      else if (p.health === 'degraded') healthCounts.degraded++;
      else healthCounts.down++;
    });
    setSystemHealth(healthCounts);
  };

  const checkProjectStatus = async (projectId: string) => {
    try {
      const project = projects[projectId];
      if (!project) return;

      const healthUrl = project.url || `http://localhost:${project.port}/api/health`;
      const res = await fetch(`/api/command-center/health?url=${encodeURIComponent(healthUrl)}`);
      
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => {
          const updated = {
            ...prev,
            [projectId]: {
              ...prev[projectId],
              status: (data.status === 'ok' ? 'running' : 'error') as 'running' | 'stopped' | 'error',
              health: (data.status === 'ok' ? 'healthy' : 'degraded') as 'healthy' | 'degraded' | 'down',
              lastCheck: new Date(),
            }
          };
          return updated;
        });
      } else {
        setProjects(prev => ({
          ...prev,
          [projectId]: {
            ...prev[projectId],
            status: 'stopped' as const,
            health: 'down' as const,
            lastCheck: new Date(),
          }
        }));
      }
    } catch (error) {
      setProjects(prev => ({
        ...prev,
        [projectId]: {
          ...prev[projectId],
          status: 'stopped' as const,
          health: 'down' as const,
          lastCheck: new Date(),
        }
      }));
    }
  };

  const handleControl = async (action: 'start' | 'stop' | 'restart', projectId: string) => {
    setLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetch('/api/command-center/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, action }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.isRemote) {
          addLog(projectId, 'warn', `⚠️ Control commands require local access. ${data.message}`);
        } else {
          addLog(projectId, 'success', `${action} command sent successfully`);
          setTimeout(() => checkProjectStatus(projectId), 2000);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        addLog(projectId, 'error', `Failed to ${action} project: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      addLog(projectId, 'error', `Error: ${error}`);
    } finally {
      setLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const sendAIMessage = async (projectId: string) => {
    const message = aiMessage[projectId] || '';
    if (!message.trim()) return;

    setLoading(prev => ({ ...prev, [`${projectId}-ai`]: true }));
    try {
      const res = await fetch('/api/command-center/ai-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message }),
      });

      if (res.ok) {
        addLog(projectId, 'success', `AI message sent: ${message.substring(0, 50)}...`);
        setAiMessage(prev => ({ ...prev, [projectId]: '' }));
      } else {
        addLog(projectId, 'error', 'Failed to send AI message');
      }
    } catch (error) {
      addLog(projectId, 'error', `Error sending AI message: ${error}`);
    } finally {
      setLoading(prev => ({ ...prev, [`${projectId}-ai`]: false }));
    }
  };

  const addLog = (projectId: string, level: ProjectLog['level'], message: string) => {
    setLogs(prev => ({
      ...prev,
      [projectId]: [
        ...(prev[projectId] || []),
        { timestamp: new Date(), level, message }
      ].slice(-100)
    }));
  };

  const exportLogs = (projectId: string) => {
    const projectLogs = logs[projectId] || [];
    const content = projectLogs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectId}-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'stopped': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredLogs = (projectLogs: ProjectLog[]) => {
    let filtered = projectLogs;
    
    if (logFilter !== 'all') {
      filtered = filtered.filter(log => log.level === logFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const selectedProjectData = projects[selectedProject];
  const projectLogs = filteredLogs(logs[selectedProject] || []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Mobile Header */}
      <div className="lg:hidden border-b border-slate-700 bg-slate-800/50 p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">🎛️ Command Center</h1>
          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            ← Launchpad
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-slate-700 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block border-b border-slate-700 bg-slate-800/50 p-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">🎛️ Unified Command Center</h1>
              <p className="text-gray-400">Monitor and control all projects from one place</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm font-medium"
              >
                🏠 Launchpad
              </Link>
              <button
                onClick={checkAllStatuses}
                className="p-2 hover:bg-slate-700 rounded-lg transition"
                title="Refresh All"
              >
                <RefreshCw className={`w-5 h-5 ${loading.refresh ? 'animate-spin' : ''}`} />
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Auto-refresh</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="border-b border-slate-700 bg-slate-800/30 p-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400">Total:</span>
              <span className="font-bold">{systemHealth.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-400">Healthy:</span>
              <span className="font-bold text-green-400">{systemHealth.healthy}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-400">Degraded:</span>
              <span className="font-bold text-yellow-400">{systemHealth.degraded}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-400">Down:</span>
              <span className="font-bold text-red-400">{systemHealth.down}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-4 md:p-6">
        {/* Project Tabs - Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden mb-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-2">
              {PROJECTS.map(project => {
                const proj = projects[project.id];
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-between ${
                      selectedProject === project.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{project.icon}</span>
                      <span className="text-sm">{project.name}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${getHealthColor(proj?.health || 'down')}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project Tabs - Desktop */}
        <div className="hidden lg:flex flex-wrap gap-2 mb-6 border-b border-slate-700 pb-4">
          {PROJECTS.map(project => {
            const proj = projects[project.id];
            return (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  selectedProject === project.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                <span>{project.icon}</span>
                <span>{project.name}</span>
                <div className={`w-2 h-2 rounded-full ${getHealthColor(proj?.health || 'down')}`} />
              </button>
            );
          })}
        </div>

        {selectedProjectData && (
          <div className="space-y-4">
              {/* Mobile: Collapsible Sections */}
            <div className="lg:hidden space-y-4">
              {/* Metrics Card - Alpha Hunter Only */}
              {selectedProject === 'alpha-hunter' && metrics[selectedProject] && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
                  <button
                    onClick={() => toggleSection('metrics')}
                    className="w-full p-4 flex items-center justify-between"
                  >
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Metrics
                    </h2>
                    {expandedSections.metrics ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  {expandedSections.metrics && (
                    <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Trades Today</div>
                        <div className="text-2xl font-bold text-blue-400">{metrics[selectedProject]?.trades || 0}</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">P&L</div>
                        <div className={`text-2xl font-bold ${(metrics[selectedProject]?.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${(metrics[selectedProject]?.pnl || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Accuracy</div>
                        <div className="text-2xl font-bold text-purple-400">{(metrics[selectedProject]?.accuracy || 0).toFixed(1)}%</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Predictions</div>
                        <div className="text-2xl font-bold text-yellow-400">{metrics[selectedProject]?.predictions || 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
                <button
                  onClick={() => toggleSection('status')}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Status
                  </h2>
                  {expandedSections.status ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.status && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Status</span>
                      <span className={`font-bold ${getStatusColor(selectedProjectData.status)}`}>
                        {selectedProjectData.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Health</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getHealthColor(selectedProjectData.health)}`} />
                        <span className="capitalize">{selectedProjectData.health}</span>
                      </div>
                    </div>
                    {selectedProjectData.lastCheck && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Last Check</span>
                        <span className="text-sm">
                          {new Date(selectedProjectData.lastCheck).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {selectedProjectData.port && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Port</span>
                        <span>{selectedProjectData.port}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Controls Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
                <button
                  onClick={() => toggleSection('controls')}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Controls
                  </h2>
                  {expandedSections.controls ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.controls && (
                  <div className="px-4 pb-4 space-y-3">
                    {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                      <div className="p-2 bg-yellow-900/30 border border-yellow-500/50 rounded text-xs text-yellow-200 mb-2">
                        ⚠️ Control commands require local access
                      </div>
                    )}
                    <button
                      onClick={() => handleControl('start', selectedProject)}
                      disabled={loading[selectedProject] || selectedProjectData.status === 'running'}
                      className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                    <button
                      onClick={() => handleControl('stop', selectedProject)}
                      disabled={loading[selectedProject] || selectedProjectData.status === 'stopped'}
                      className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                    <button
                      onClick={() => handleControl('restart', selectedProject)}
                      disabled={loading[selectedProject]}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restart
                    </button>
                  </div>
                )}
              </div>

              {/* AI Messaging Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
                <button
                  onClick={() => toggleSection('ai')}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    AI Messaging
                  </h2>
                  {expandedSections.ai ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.ai && (
                  <div className="px-4 pb-4 space-y-3">
                    <textarea
                      value={aiMessage[selectedProject] || ''}
                      onChange={(e) => setAiMessage(prev => ({ ...prev, [selectedProject]: e.target.value }))}
                      placeholder="Send message to Claude/Gemini/Cursor..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white resize-none"
                      rows={4}
                    />
                    <button
                      onClick={() => sendAIMessage(selectedProject)}
                      disabled={loading[`${selectedProject}-ai`] || !aiMessage[selectedProject]?.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <Send className="w-4 h-4" />
                      {loading[`${selectedProject}-ai`] ? 'Sending...' : 'Send to AI'}
                    </button>
                  </div>
                )}
              </div>

              {/* Risk Factors Card - Alpha Hunter Only */}
              {selectedProject === 'alpha-hunter' && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
                  <button
                    onClick={() => toggleSection('riskFactors')}
                    className="w-full p-4 flex items-center justify-between"
                  >
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Sliders className="w-5 h-5" />
                      Risk Factors
                    </h2>
                    {expandedSections.riskFactors ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  {expandedSections.riskFactors && (
                    <div className="px-4 pb-4 space-y-4 max-h-[600px] overflow-y-auto">
                      {['crypto-main', 'microcap', 'kalshi-politics', 'kalshi-sports', 'kalshi-economics', 'kalshi-weather', 'kalshi-entertainment'].map(trader => {
                        const factors = riskFactors[trader] || {};
                        const traderNames: Record<string, string> = {
                          'crypto-main': 'Crypto Main',
                          'microcap': 'Microcap',
                          'kalshi-politics': 'Kalshi Politics',
                          'kalshi-sports': 'Kalshi Sports',
                          'kalshi-economics': 'Kalshi Economics',
                          'kalshi-weather': 'Kalshi Weather',
                          'kalshi-entertainment': 'Kalshi Entertainment',
                        };
                        return (
                          <div key={trader} className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-sm text-blue-400">{traderNames[trader]}</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Min Confidence (%)</label>
                                <input
                                  type="number"
                                  value={factors.minConfidence || ''}
                                  onChange={(e) => saveRiskFactor(trader, { minConfidence: parseFloat(e.target.value) })}
                                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                  min="50"
                                  max="90"
                                  step="1"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Min Edge (%)</label>
                                <input
                                  type="number"
                                  value={factors.minEdge || ''}
                                  onChange={(e) => saveRiskFactor(trader, { minEdge: parseFloat(e.target.value) })}
                                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                />
                              </div>
                              {factors.maxTradeSize !== undefined && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Max Trade Size ($)</label>
                                  <input
                                    type="number"
                                    value={factors.maxTradeSize || ''}
                                    onChange={(e) => saveRiskFactor(trader, { maxTradeSize: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    min="1"
                                    max="100"
                                    step="1"
                                  />
                                </div>
                              )}
                              {factors.maxBetSize !== undefined && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Max Bet Size ($)</label>
                                  <input
                                    type="number"
                                    value={factors.maxBetSize || ''}
                                    onChange={(e) => saveRiskFactor(trader, { maxBetSize: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    min="1"
                                    max="50"
                                    step="1"
                                  />
                                </div>
                              )}
                              {factors.maxPositions !== undefined && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Max Positions</label>
                                  <input
                                    type="number"
                                    value={factors.maxPositions || ''}
                                    onChange={(e) => saveRiskFactor(trader, { maxPositions: parseInt(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    min="1"
                                    max="10"
                                    step="1"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Advanced Parameters - Microcap Only */}
                            {trader === 'microcap' && (
                              <div className="mt-3 pt-3 border-t border-slate-700">
                                <button
                                  onClick={() => setExpandedTraders(prev => ({ ...prev, [trader]: !prev[trader] }))}
                                  className="w-full flex items-center justify-between text-xs text-gray-400 mb-2"
                                >
                                  <span>Advanced Parameters</span>
                                  {expandedTraders[trader] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {expandedTraders[trader] && (
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <label className="text-gray-500 block mb-1">RSI Extreme Oversold</label>
                                      <input
                                        type="number"
                                        value={factors.rsiExtremeOversold || ''}
                                        onChange={(e) => saveRiskFactor(trader, { rsiExtremeOversold: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="10"
                                        max="30"
                                        step="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">RSI Oversold</label>
                                      <input
                                        type="number"
                                        value={factors.rsiOversold || ''}
                                        onChange={(e) => saveRiskFactor(trader, { rsiOversold: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="20"
                                        max="40"
                                        step="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">RSI Overbought</label>
                                      <input
                                        type="number"
                                        value={factors.rsiOverbought || ''}
                                        onChange={(e) => saveRiskFactor(trader, { rsiOverbought: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="70"
                                        max="90"
                                        step="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Trend Strength Strong</label>
                                      <input
                                        type="number"
                                        value={factors.trendStrengthStrong || ''}
                                        onChange={(e) => saveRiskFactor(trader, { trendStrengthStrong: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="70"
                                        max="100"
                                        step="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Edge Blend Calculated</label>
                                      <input
                                        type="number"
                                        value={factors.edgeBlendCalculated || ''}
                                        onChange={(e) => saveRiskFactor(trader, { edgeBlendCalculated: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Edge Blend AI</label>
                                      <input
                                        type="number"
                                        value={factors.edgeBlendAI || ''}
                                        onChange={(e) => saveRiskFactor(trader, { edgeBlendAI: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Volume Low</label>
                                      <input
                                        type="number"
                                        value={factors.volumeLow || ''}
                                        onChange={(e) => saveRiskFactor(trader, { volumeLow: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="0"
                                        step="1000"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Volume High</label>
                                      <input
                                        type="number"
                                        value={factors.volumeHigh || ''}
                                        onChange={(e) => saveRiskFactor(trader, { volumeHigh: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="0"
                                        step="10000"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Confidence Cap</label>
                                      <input
                                        type="number"
                                        value={factors.confidenceCap || ''}
                                        onChange={(e) => saveRiskFactor(trader, { confidenceCap: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="70"
                                        max="90"
                                        step="1"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {loading[`risk-${trader}`] && (
                              <div className="text-xs text-blue-400">Saving...</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop: Grid Layout */}
            <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Status & Controls */}
              <div className="lg:col-span-1 space-y-6">
                {/* Metrics Card - Alpha Hunter Only */}
                {selectedProject === 'alpha-hunter' && metrics[selectedProject] && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Metrics
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Trades Today</div>
                        <div className="text-3xl font-bold text-blue-400">{metrics[selectedProject]?.trades || 0}</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">P&L</div>
                        <div className={`text-3xl font-bold ${(metrics[selectedProject]?.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${(metrics[selectedProject]?.pnl || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Accuracy</div>
                        <div className="text-3xl font-bold text-purple-400">{(metrics[selectedProject]?.accuracy || 0).toFixed(1)}%</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Predictions</div>
                        <div className="text-3xl font-bold text-yellow-400">{metrics[selectedProject]?.predictions || 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Card */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Status
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Status</span>
                      <span className={`font-bold ${getStatusColor(selectedProjectData.status)}`}>
                        {selectedProjectData.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Health</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getHealthColor(selectedProjectData.health)}`} />
                        <span className="capitalize">{selectedProjectData.health}</span>
                      </div>
                    </div>
                    {selectedProjectData.lastCheck && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Last Check</span>
                        <span className="text-sm">
                          {new Date(selectedProjectData.lastCheck).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {selectedProjectData.port && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Port</span>
                        <span>{selectedProjectData.port}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls Card */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Controls
                  </h2>
                  {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                    <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-sm text-yellow-200">
                      ⚠️ <strong>Remote Access:</strong> Control commands require local network access. Use localhost or tunnel for Start/Stop/Restart.
                    </div>
                  )}
                  <div className="space-y-3">
                    <button
                      onClick={() => handleControl('start', selectedProject)}
                      disabled={loading[selectedProject] || selectedProjectData.status === 'running'}
                      className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                    <button
                      onClick={() => handleControl('stop', selectedProject)}
                      disabled={loading[selectedProject] || selectedProjectData.status === 'stopped'}
                      className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                    <button
                      onClick={() => handleControl('restart', selectedProject)}
                      disabled={loading[selectedProject]}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restart
                    </button>
                  </div>
                </div>

                {/* AI Messaging Card */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    AI Messaging
                  </h2>
                  <div className="space-y-3">
                    <textarea
                      value={aiMessage[selectedProject] || ''}
                      onChange={(e) => setAiMessage(prev => ({ ...prev, [selectedProject]: e.target.value }))}
                      placeholder="Send message to Claude/Gemini/Cursor..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white resize-none"
                      rows={4}
                    />
                    <button
                      onClick={() => sendAIMessage(selectedProject)}
                      disabled={loading[`${selectedProject}-ai`] || !aiMessage[selectedProject]?.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {loading[`${selectedProject}-ai`] ? 'Sending...' : 'Send to AI'}
                    </button>
                  </div>
                </div>

                {/* Risk Factors Card - Alpha Hunter Only */}
                {selectedProject === 'alpha-hunter' && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Sliders className="w-5 h-5" />
                      Risk Factors
                    </h2>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {['crypto-main', 'microcap', 'kalshi-politics', 'kalshi-sports', 'kalshi-economics', 'kalshi-weather', 'kalshi-entertainment'].map(trader => {
                        const factors = riskFactors[trader] || {};
                        const traderNames: Record<string, string> = {
                          'crypto-main': 'Crypto Main',
                          'microcap': 'Microcap',
                          'kalshi-politics': 'Kalshi Politics',
                          'kalshi-sports': 'Kalshi Sports',
                          'kalshi-economics': 'Kalshi Economics',
                          'kalshi-weather': 'Kalshi Weather',
                          'kalshi-entertainment': 'Kalshi Entertainment',
                        };
                        return (
                          <div key={trader} className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-sm text-blue-400">{traderNames[trader]}</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Min Confidence (%)</label>
                                <input
                                  type="number"
                                  value={factors.minConfidence || ''}
                                  onChange={(e) => saveRiskFactor(trader, { minConfidence: parseFloat(e.target.value) })}
                                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                  min="50"
                                  max="90"
                                  step="1"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Min Edge (%)</label>
                                <input
                                  type="number"
                                  value={factors.minEdge || ''}
                                  onChange={(e) => saveRiskFactor(trader, { minEdge: parseFloat(e.target.value) })}
                                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                />
                              </div>
                              {factors.maxTradeSize !== undefined && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Max Trade Size ($)</label>
                                  <input
                                    type="number"
                                    value={factors.maxTradeSize || ''}
                                    onChange={(e) => saveRiskFactor(trader, { maxTradeSize: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    min="1"
                                    max="100"
                                    step="1"
                                  />
                                </div>
                              )}
                              {factors.maxBetSize !== undefined && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Max Bet Size ($)</label>
                                  <input
                                    type="number"
                                    value={factors.maxBetSize || ''}
                                    onChange={(e) => saveRiskFactor(trader, { maxBetSize: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    min="1"
                                    max="50"
                                    step="1"
                                  />
                                </div>
                              )}
                              {factors.maxPositions !== undefined && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Max Positions</label>
                                  <input
                                    type="number"
                                    value={factors.maxPositions || ''}
                                    onChange={(e) => saveRiskFactor(trader, { maxPositions: parseInt(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    min="1"
                                    max="10"
                                    step="1"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Advanced Parameters - Microcap Only (Desktop) */}
                            {trader === 'microcap' && (
                              <div className="mt-3 pt-3 border-t border-slate-700">
                                <button
                                  onClick={() => setExpandedTraders(prev => ({ ...prev, [trader]: !prev[trader] }))}
                                  className="w-full flex items-center justify-between text-xs text-gray-400 mb-2 hover:text-gray-300"
                                >
                                  <span>Advanced Parameters</span>
                                  {expandedTraders[trader] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {expandedTraders[trader] && (
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <label className="text-gray-500 block mb-1">RSI Extreme Oversold</label>
                                      <input
                                        type="number"
                                        value={factors.rsiExtremeOversold || ''}
                                        onChange={(e) => saveRiskFactor(trader, { rsiExtremeOversold: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="10"
                                        max="30"
                                        step="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">RSI Oversold</label>
                                      <input
                                        type="number"
                                        value={factors.rsiOversold || ''}
                                        onChange={(e) => saveRiskFactor(trader, { rsiOversold: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="20"
                                        max="40"
                                        step="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">RSI Overbought</label>
                                      <input
                                        type="number"
                                        value={factors.rsiOverbought || ''}
                                        onChange={(e) => saveRiskFactor(trader, { rsiOverbought: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="70"
                                        max="90"
                                        step="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Trend Strength Strong</label>
                                      <input
                                        type="number"
                                        value={factors.trendStrengthStrong || ''}
                                        onChange={(e) => saveRiskFactor(trader, { trendStrengthStrong: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="70"
                                        max="100"
                                        step="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Edge Blend Calculated</label>
                                      <input
                                        type="number"
                                        value={factors.edgeBlendCalculated || ''}
                                        onChange={(e) => saveRiskFactor(trader, { edgeBlendCalculated: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Edge Blend AI</label>
                                      <input
                                        type="number"
                                        value={factors.edgeBlendAI || ''}
                                        onChange={(e) => saveRiskFactor(trader, { edgeBlendAI: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Volume Low</label>
                                      <input
                                        type="number"
                                        value={factors.volumeLow || ''}
                                        onChange={(e) => saveRiskFactor(trader, { volumeLow: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="0"
                                        step="1000"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Volume High</label>
                                      <input
                                        type="number"
                                        value={factors.volumeHigh || ''}
                                        onChange={(e) => saveRiskFactor(trader, { volumeHigh: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="0"
                                        step="10000"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-500 block mb-1">Confidence Cap</label>
                                      <input
                                        type="number"
                                        value={factors.confidenceCap || ''}
                                        onChange={(e) => saveRiskFactor(trader, { confidenceCap: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        min="70"
                                        max="90"
                                        step="1"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {loading[`risk-${trader}`] && (
                              <div className="text-xs text-blue-400">Saving...</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Logs */}
              <div className="lg:col-span-2">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-[calc(100vh-300px)] flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Terminal className="w-5 h-5" />
                      Live Logs
                    </h2>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search logs..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-sm text-white w-40"
                        />
                      </div>
                      <select
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white"
                      >
                        <option value="all">All</option>
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                      </select>
                      <button
                        onClick={() => exportLogs(selectedProject)}
                        className="p-2 hover:bg-slate-700 rounded-lg"
                        title="Export Logs"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-4 font-mono text-sm">
                    {projectLogs.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">
                        No logs yet. Start the project to see logs.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {projectLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-3 ${
                              log.level === 'error' ? 'text-red-400' :
                              log.level === 'warn' ? 'text-yellow-400' :
                              log.level === 'success' ? 'text-green-400' :
                              'text-gray-300'
                            }`}
                          >
                            <span className="text-gray-500 text-xs">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            <span className="font-semibold">[{log.level.toUpperCase()}]</span>
                            <span className="flex-1 break-words">{log.message}</span>
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Logs Section */}
            <div className="lg:hidden bg-slate-800/50 border border-slate-700 rounded-xl">
              <button
                onClick={() => toggleSection('logs')}
                className="w-full p-4 flex items-center justify-between"
              >
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Live Logs
                </h2>
                {expandedSections.logs ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.logs && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white w-full"
                      />
                    </div>
                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="all">All</option>
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </select>
                    <button
                      onClick={() => exportLogs(selectedProject)}
                      className="p-2 hover:bg-slate-700 rounded-lg"
                      title="Export Logs"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm max-h-[400px] overflow-y-auto">
                    {projectLogs.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">
                        No logs yet. Start the project to see logs.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {projectLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col gap-1 ${
                              log.level === 'error' ? 'text-red-400' :
                              log.level === 'warn' ? 'text-yellow-400' :
                              log.level === 'success' ? 'text-green-400' :
                              'text-gray-300'
                            }`}
                          >
                            <div className="flex gap-2 text-xs text-gray-500">
                              <span>{log.timestamp.toLocaleTimeString()}</span>
                              <span className="font-semibold">[{log.level.toUpperCase()}]</span>
                            </div>
                            <span className="break-words">{log.message}</span>
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
