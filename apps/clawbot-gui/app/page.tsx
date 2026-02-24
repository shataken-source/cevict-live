'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Terminal, Play, Activity, Users, Send, Bot, RefreshCw,
  Cpu, Puzzle, Trash2, Plus, RotateCcw, Info,
  MessageCircle, Hash, List, Download, Eye,
  Globe, Stethoscope, Shield, AlertCircle,
  Loader2, ExternalLink, Clock,
  Database, Zap, Key
} from 'lucide-react';

interface ChatMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string; ts: number; }
interface GatewayInfo { token: string | null; port: number; gatewayUrl: string; dashboardUrl: string; }
interface QuickCmd { id: string; category: string; label: string; command: string; icon: any; description: string; }
type Tab = 'chat' | 'terminal' | 'commands';
function uid() { return Math.random().toString(36).slice(2); }
const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high'] as const;

const QUICK_CMDS: QuickCmd[] = [
  { id: 'status', category: 'Core', label: 'Status', command: 'gateway status', icon: Activity, description: 'Gateway status' },
  { id: 'doctor', category: 'Core', label: 'Doctor', command: 'doctor', icon: Stethoscope, description: 'Health checks' },
  { id: 'version', category: 'Core', label: 'Version', command: '--version', icon: Info, description: 'Show version' },
  { id: 'update', category: 'Core', label: 'Update', command: 'update', icon: RefreshCw, description: 'Update OpenClaw' },
  { id: 'models', category: 'Models', label: 'Models', command: 'models list', icon: Cpu, description: 'List AI models' },
  { id: 'agents', category: 'Agents', label: 'Agents', command: 'agents list', icon: Users, description: 'List agents' },
  { id: 'channels', category: 'Channels', label: 'Channels', command: 'channels list', icon: Hash, description: 'List channels' },
  { id: 'skills', category: 'Skills', label: 'Skills', command: 'skills list', icon: Puzzle, description: 'List skills' },
  { id: 'cron', category: 'Cron', label: 'Cron Jobs', command: 'cron list', icon: Clock, description: 'Scheduled jobs' },
  { id: 'memory', category: 'Memory', label: 'Memory', command: 'memory list', icon: Database, description: 'Memory entries' },
  { id: 'sessions', category: 'Sessions', label: 'Sessions', command: 'sessions list', icon: List, description: 'Active sessions' },
  { id: 'security', category: 'Security', label: 'Security', command: 'security status', icon: Shield, description: 'Security status' },
  { id: 'approvals', category: 'Security', label: 'Approvals', command: 'approvals list', icon: Eye, description: 'Pending approvals' },
  { id: 'gw-restart', category: 'Gateway', label: 'Restart GW', command: 'gateway restart', icon: RotateCcw, description: 'Restart gateway' },
  { id: 'gw-install', category: 'Gateway', label: 'Install Svc', command: 'gateway install', icon: Download, description: 'Install as service' },
];

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('chat');
  const [gwInfo, setGwInfo] = useState<GatewayInfo | null>(null);
  const [gwOnline, setGwOnline] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatThinking, setChatThinking] = useState<string>('medium');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [termOutput, setTermOutput] = useState('');
  const [termInput, setTermInput] = useState('');
  const [termLoading, setTermLoading] = useState(false);
  const termEndRef = useRef<HTMLDivElement>(null);
  const [cmdLoading, setCmdLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gateway-info').then(r => r.json()).then(setGwInfo).catch(() => { });
  }, []);

  useEffect(() => {
    const check = () => {
      fetch('/api/exec', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'health' }),
        signal: AbortSignal.timeout(5000),
      }).then(r => r.json()).then(d => setGwOnline(d.success)).catch(() => setGwOnline(false));
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [termOutput]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { id: uid(), role: 'user', content: text, ts: Date.now() }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: chatSessionId, thinking: chatThinking }),
      });
      const data = await res.json();
      if (data.sessionId) setChatSessionId(data.sessionId);
      setChatMessages(prev => [...prev, {
        id: uid(), role: 'assistant',
        content: data.reply || data.error || 'No response.',
        ts: Date.now(),
      }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        id: uid(), role: 'system',
        content: `Error: ${err.message}`,
        ts: Date.now(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const runCmd = async (command: string) => {
    setCmdLoading(command);
    setTermLoading(true);
    setTermOutput(prev => prev + `\n$ openclaw ${command}\n${'─'.repeat(48)}\n`);
    try {
      const res = await fetch('/api/exec', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      setTermOutput(prev => prev + (data.stdout || data.stderr || data.error || 'Done.') + '\n');
    } catch (err: any) {
      setTermOutput(prev => prev + `ERROR: ${err.message}\n`);
    } finally {
      setCmdLoading(null);
      setTermLoading(false);
      setTab('terminal');
    }
  };


  const tabBtn = (t: Tab, label: string, Icon: any) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
    >
      <Icon className="w-4 h-4" />{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">OpenClaw Control</h1>
          <p className="text-xs text-slate-500">v2026.2.19-2 · claude-opus-4-6</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {/* Gateway status */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${gwOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
            <span className="text-slate-400">Gateway</span>
            <span className={gwOnline ? 'text-emerald-400' : 'text-red-400'}>{gwOnline ? 'Online' : 'Offline'}</span>
          </div>
          {chatLoading && (
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
              <span className="text-orange-400">Agent thinking…</span>
            </div>
          )}
          <a href={gwInfo?.dashboardUrl || 'http://127.0.0.1:18789/'} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
            <ExternalLink className="w-3 h-3" />Dashboard
          </a>
        </div>
      </header>

      {/* Offline banner */}
      {!gwOnline && (
        <div className="bg-red-950 border-b border-red-800 px-5 py-2 flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Gateway offline — run <code className="bg-red-900 px-1 rounded">openclaw gateway start</code> to start it.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Commands</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {QUICK_CMDS.map(cmd => (
              <button key={cmd.id} onClick={() => runCmd(cmd.command)}
                disabled={cmdLoading === cmd.command}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left disabled:opacity-40 group">
                <cmd.icon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {cmdLoading === cmd.command ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin inline" /> Running…</span> : cmd.label}
                  </p>
                  <p className="text-xs text-slate-600 truncate">{cmd.description}</p>
                </div>
              </button>
            ))}
          </div>
          {/* Status tiles */}
          <div className="p-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1"><Key className="w-3 h-3" />Token</span>
              <span className={gwInfo?.token ? 'text-emerald-400' : 'text-red-400'}>{gwInfo?.token ? 'Set' : 'Missing'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1"><Globe className="w-3 h-3" />Port</span>
              <span className="text-slate-300">{gwInfo?.port ?? 18789}</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
            {tabBtn('chat', 'Chat', MessageCircle)}
            {tabBtn('terminal', 'Terminal', Terminal)}
            {tabBtn('commands', 'Commands', Zap)}
          </div>

          {/* ── Chat tab ── */}
          {tab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-slate-600">
                    <Bot className="w-12 h-12 opacity-30" />
                    <p className="text-sm">Chat with OpenClaw Agent</p>
                    <p className="text-xs">{gwOnline ? 'Type a message below to start a conversation' : 'Gateway offline — start it first'}</p>
                  </div>
                )}
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === 'user' ? 'bg-orange-500' : msg.role === 'system' ? 'bg-slate-700' : 'bg-purple-600'}`}>
                      {msg.role === 'user' ? 'U' : msg.role === 'system' ? '·' : '🦞'}
                    </div>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-orange-500/20 text-orange-100' : msg.role === 'system' ? 'bg-slate-800 text-slate-400 italic text-xs' : 'bg-slate-800 text-slate-200'}`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs text-slate-600 mt-1">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-purple-600">🦞</div>
                    <div className="bg-slate-800 rounded-xl px-3 py-2 text-sm text-slate-400">
                      <div className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2 items-center">
                <select
                  value={chatThinking}
                  onChange={e => setChatThinking(e.target.value)}
                  title="Thinking level"
                  className="px-2 py-2 bg-slate-800 rounded-lg text-xs text-slate-400 border border-slate-700 focus:border-orange-500 focus:outline-none"
                >
                  {THINKING_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder={gwOnline ? 'Message OpenClaw… (Enter to send)' : 'Gateway offline'}
                  disabled={chatLoading}
                  className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-700 focus:border-orange-500 focus:outline-none disabled:opacity-40"
                />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white transition-colors disabled:opacity-40">
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
                {chatSessionId && (
                  <button onClick={() => { setChatSessionId(null); setChatMessages([]); }} title="New session"
                    className="px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Terminal tab ── */}
          {tab === 'terminal' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 bg-black overflow-y-auto p-4 font-mono text-sm">
                {termOutput ? (
                  <pre className="text-green-400 whitespace-pre-wrap">{termOutput}</pre>
                ) : (
                  <p className="text-slate-600 italic">Run a command from the sidebar or type below…</p>
                )}
                <div ref={termEndRef} />
              </div>
              <div className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
                <span className="px-2 py-2 bg-slate-800 rounded-lg text-slate-500 text-xs font-mono shrink-0">openclaw</span>
                <input
                  value={termInput}
                  onChange={e => setTermInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && termInput.trim() && (runCmd(termInput.trim()), setTermInput(''))}
                  placeholder="gateway status, models list, doctor…"
                  className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-700 focus:border-orange-500 focus:outline-none font-mono"
                />
                <button onClick={() => termInput.trim() && (runCmd(termInput.trim()), setTermInput(''))}
                  disabled={termLoading || !termInput.trim()}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white transition-colors disabled:opacity-40">
                  {termLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={() => setTermOutput('')} title="Clear" className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Commands tab ── */}
          {tab === 'commands' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-3">
                {QUICK_CMDS.map(cmd => (
                  <button key={cmd.id} onClick={() => runCmd(cmd.command)}
                    disabled={cmdLoading === cmd.command}
                    className="flex items-start gap-3 p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/40 rounded-xl transition-all text-left disabled:opacity-40">
                    <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <cmd.icon className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">{cmd.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{cmd.description}</p>
                      <p className="text-xs text-slate-700 font-mono mt-1 truncate">{cmd.command}</p>
                    </div>
                    {cmdLoading === cmd.command && <Loader2 className="w-4 h-4 animate-spin text-orange-400 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
