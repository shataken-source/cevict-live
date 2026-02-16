'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  MapPin,
  Battery,
  MessageSquare,
  Send,
  Users,
  Signal,
  AlertTriangle,
  Bluetooth,
  Usb,
  Wifi,
  Navigation,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  Trash2,
  Zap,
  Shield,
  Target,
  Mountain,
  TreePine,
  Waves,
  Clock,
  Activity
} from 'lucide-react';

// Meshtastic Node Interface
interface MeshNode {
  id: string;
  name: string;
  shortName: string;
  lat?: number;
  lng?: number;
  altitude?: number;
  batteryLevel?: number;
  voltage?: number;
  lastHeard: number;
  snr?: number;
  hopsAway?: number;
  isOnline: boolean;
  role: 'client' | 'router' | 'repeater';
  // Enhanced fields
  airUtilTx?: number;
  channelUtilization?: number;
  temperature?: number;
  uptimeSeconds?: number;
}

interface MeshMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  isEmergency?: boolean;
  isEncrypted?: boolean;
}

// Enhanced mock data with more realistic camping scenario
const MOCK_NODES: MeshNode[] = [
  { id: '!a1b2c3d4', name: 'Camp Base', shortName: 'BASE', lat: 44.5, lng: -110.0, altitude: 7200, batteryLevel: 85, voltage: 4.1, lastHeard: Date.now() / 1000 - 60, snr: 8, hopsAway: 0, isOnline: true, role: 'router', airUtilTx: 3.2, channelUtilization: 15, temperature: 22, uptimeSeconds: 86400 },
  { id: '!b2c3d4e5', name: 'Hiking Group', shortName: 'HIKE', lat: 44.52, lng: -110.05, altitude: 7450, batteryLevel: 62, voltage: 3.9, lastHeard: Date.now() / 1000 - 300, snr: 4, hopsAway: 1, isOnline: true, role: 'client', airUtilTx: 1.8, temperature: 18, uptimeSeconds: 43200 },
  { id: '!c3d4e5f6', name: 'Fishing Spot', shortName: 'FISH', lat: 44.48, lng: -109.95, altitude: 6800, batteryLevel: 45, voltage: 3.7, lastHeard: Date.now() / 1000 - 900, snr: -2, hopsAway: 2, isOnline: true, role: 'client', airUtilTx: 0.5, temperature: 25, uptimeSeconds: 21600 },
  { id: '!d4e5f6g7', name: 'Scout Unit', shortName: 'SCOUT', lat: 44.55, lng: -110.1, altitude: 7800, batteryLevel: 30, voltage: 3.5, lastHeard: Date.now() / 1000 - 1800, snr: -8, hopsAway: 2, isOnline: false, role: 'client', temperature: 15, uptimeSeconds: 10800 },
];

const MOCK_MESSAGES: MeshMessage[] = [
  { id: '1', from: '!b2c3d4e5', to: 'broadcast', text: 'Found a great viewpoint at the ridge!', timestamp: Date.now() - 600000, isEmergency: false, isEncrypted: true },
  { id: '2', from: '!c3d4e5f6', to: 'broadcast', text: 'Caught 3 trout, heading back in 30 min', timestamp: Date.now() - 1200000, isEmergency: false, isEncrypted: true },
];

// Message templates for quick sending
const MESSAGE_TEMPLATES = [
  { icon: '🆘', label: 'SOS', text: 'SOS - Need help! Send location.', color: 'bg-red-600' },
  { icon: '📍', label: 'Location', text: 'I\'m at the marked waypoint. Join me!', color: 'bg-blue-600' },
  { icon: '🏕️', label: 'Camp', text: 'Setting up camp here. GPS coordinates shared.', color: 'bg-emerald-600' },
  { icon: '⛽', label: 'Low Batt', text: 'Battery running low. May go silent soon.', color: 'bg-amber-600' },
  { icon: '🔄', label: 'Check-in', text: 'Regular check-in. All good here!', color: 'bg-slate-600' },
];

// Terrain types for range calculator
const TERRAIN_TYPES = [
  { name: 'Open Water', factor: 1.0, icon: Waves, description: 'Lake, river, flat terrain' },
  { name: 'Open Country', factor: 0.9, icon: Target, description: 'Fields, plains, desert' },
  { name: 'Forested', factor: 0.6, icon: TreePine, description: 'Dense trees, light vegetation' },
  { name: 'Mountain', factor: 0.4, icon: Mountain, description: 'Steep terrain, valleys, ridges' },
  { name: 'Dense Urban', factor: 0.3, icon: Users, description: 'Buildings, structures' },
];

export default function MeshNetwork() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'ble' | 'serial' | 'wifi' | null>(null);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [messages, setMessages] = useState<MeshMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedNode, setSelectedNode] = useState<string>('broadcast');
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [myNodeId, setMyNodeId] = useState('!a1b2c3d4');
  const [isConnecting, setIsConnecting] = useState(false);

  // New state for enhancements
  const [showRadar, setShowRadar] = useState(true);
  const [selectedTerrain, setSelectedTerrain] = useState(2); // Forested default
  const [selectedPower, setSelectedPower] = useState(20); // 20dBm default
  const [meshHealth, setMeshHealth] = useState({ score: 0, status: 'unknown' });
  const [showPresets, setShowPresets] = useState(false);

  // Meshtastic API data
  const [packetLog, setPacketLog] = useState<Array<{
    id: string;
    from: string;
    to: string;
    type: 'text' | 'telemetry' | 'position' | 'routing';
    snr: number;
    hops: number;
    timestamp: number;
    size: number;
  }>>([]);
  const [airUtilization, setAirUtilization] = useState(15); // percentage
  const [channelUtilization, setChannelUtilization] = useState(12); // percentage
  const [snrHistory, setSnrHistory] = useState<{ time: string; snr: number }[]>([]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
      Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  function timeAgo(timestamp: number): string {
    const seconds = Date.now() / 1000 - timestamp;
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // Helper to get cardinal direction from bearing
  function getCardinal(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const msg: MeshMessage = {
      id: `msg-${Date.now()}`,
      from: myNodeId,
      to: selectedNode,
      text: newMessage,
      timestamp: Date.now(),
      isEmergency: newMessage.toUpperCase().includes('SOS') || newMessage.toUpperCase().includes('EMERGENCY')
    };

    setMessages(prev => [msg, ...prev]);
    setNewMessage('');
  };

  // Simulate connection
  const connectToRadio = async (type: 'ble' | 'serial' | 'wifi') => {
    setIsConnecting(true);

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    setConnectionType(type);
    setIsConnected(true);
    setIsConnecting(false);
    // In real implementation, would populate nodes/messages from radio
    setNodes([]);
    setMessages([]);
  };

  // Get battery color
  const getBatteryColor = (level?: number) => {
    if (!level) return 'text-slate-400';
    if (level > 60) return 'text-emerald-400';
    if (level > 20) return 'text-amber-400';
    return 'text-red-400';
  };

  // Get signal quality
  const getSignalQuality = (snr?: number) => {
    if (!snr) return { label: 'Unknown', color: 'text-slate-400' };
    if (snr > 5) return { label: 'Strong', color: 'text-emerald-400' };
    if (snr > 0) return { label: 'Fair', color: 'text-amber-400' };
    if (snr > -10) return { label: 'Weak', color: 'text-orange-400' };
    return { label: 'Lost', color: 'text-red-400' };
  };

  // Calculate mesh health score
  useEffect(() => {
    if (nodes.length === 0) {
      setMeshHealth({ score: 0, status: 'No nodes connected' });
      return;
    }

    const onlineNodes = nodes.filter(n => n.isOnline).length;
    const totalNodes = nodes.length;
    const avgSnr = nodes.reduce((acc, n) => acc + (n.snr || 0), 0) / totalNodes;

    // Health score formula
    let score = Math.round((onlineNodes / totalNodes) * 70); // 70% for online ratio
    score += Math.min(Math.round((avgSnr + 10) / 20 * 30), 30); // 30% for signal quality
    score = Math.min(100, Math.max(0, score));

    let status = 'Poor';
    if (score > 80) status = 'Excellent';
    else if (score > 60) status = 'Good';
    else if (score > 40) status = 'Fair';

    setMeshHealth({ score, status });
  }, [nodes]);

  const myNode = nodes.find(n => n.id === myNodeId) || {
    id: myNodeId,
    name: 'My Node',
    shortName: 'ME',
    batteryLevel: undefined,
    snr: undefined,
    isOnline: false,
    role: 'client',
    lastHeard: Date.now() / 1000
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold">Mesh Network</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isConnected
              ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
              : 'bg-amber-900/50 text-amber-400 border border-amber-700/50'
              }`}>
              {isConnected ? `Connected (${connectionType?.toUpperCase()})` : 'Disconnected'}
            </div>
          </div>
        </div>
        <p className="text-slate-400 mt-2">
          Off-grid communication with your group. No cell service required.
        </p>

        {!isConnected && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => connectToRadio('ble')}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg transition-colors"
            >
              <Bluetooth className="w-4 h-4" />
              {isConnecting ? 'Connecting...' : 'Connect Bluetooth'}
            </button>
            <button
              onClick={() => connectToRadio('serial')}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 rounded-lg transition-colors"
            >
              <Usb className="w-4 h-4" />
              USB Serial
            </button>
            <button
              onClick={() => connectToRadio('wifi')}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 rounded-lg transition-colors"
            >
              <Wifi className="w-4 h-4" />
              WiFi (TCP)
            </button>
          </div>
        )}
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">Nodes Online</div>
          <div className="text-3xl font-bold text-emerald-400">
            {nodes.filter(n => n.isOnline).length}/{nodes.length || '--'}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">Messages Today</div>
          <div className="text-3xl font-bold text-blue-400">{messages.length}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">My Battery</div>
          <div className={`text-3xl font-bold ${getBatteryColor(myNode.batteryLevel)}`}>
            {myNode.batteryLevel !== undefined ? `${myNode.batteryLevel}%` : '--'}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">Mesh SNR</div>
          <div className={`text-3xl font-bold ${getSignalQuality(myNode.snr).color}`}>
            {myNode.snr !== undefined ? `${myNode.snr}dB` : '--'}
          </div>
        </div>
      </div>

      {/* Network Topology Radar */}
      {showRadar && nodes.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold">Network Topology</h3>
            </div>
            <button
              onClick={() => setShowRadar(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Hide
            </button>
          </div>

          <div className="relative h-64 bg-slate-900 rounded-lg overflow-hidden">
            {/* Range rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border border-slate-700 rounded-full opacity-30" />
              <div className="absolute w-32 h-32 border border-slate-600 rounded-full opacity-40" />
              <div className="absolute w-16 h-16 border border-slate-500 rounded-full opacity-50" />
            </div>

            {/* Center node (ME) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-blue-400 whitespace-nowrap">YOU</span>
            </div>

            {/* Connected nodes positioned by distance and bearing */}
            {nodes.filter(n => n.id !== myNodeId && n.lat && n.lng).map((node, idx) => {
              const myNode = nodes.find(n => n.id === myNodeId);
              if (!myNode?.lat || !myNode?.lng) return null;

              const distance = calculateDistance(myNode.lat, myNode.lng, node.lat!, node.lng!);
              const bearing = calculateBearing(myNode.lat, myNode.lng, node.lat!, node.lng!);
              const maxDist = 3; // miles, for scaling
              const scale = Math.min(distance / maxDist, 1) * 80; // max 80% from center
              const angle = (bearing - 90) * (Math.PI / 180); // Convert to radians, offset for CSS
              const x = 50 + scale * Math.cos(angle);
              const y = 50 + scale * Math.sin(angle);

              return (
                <div
                  key={node.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className={`w-3 h-3 rounded-full ${node.isOnline ? 'bg-emerald-400' : 'bg-red-400'} shadow-lg`} />
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-400 whitespace-nowrap">
                    {node.shortName}
                  </span>
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs text-slate-500">
                    {distance.toFixed(1)}mi
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full" /> You</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-400 rounded-full" /> Online</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-400 rounded-full" /> Offline</span>
            <span className="flex items-center gap-1"><div className="w-8 border-t border-slate-600" /> 3mi range</span>
          </div>
        </div>
      )}

      {/* Mesh Health & Range Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mesh Health Score */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold">Mesh Health</h3>
          </div>

          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${meshHealth.score > 80 ? 'text-emerald-400' :
              meshHealth.score > 50 ? 'text-amber-400' :
                'text-red-400'
              }`}>
              {meshHealth.score}%
            </div>
            <div className="flex-1">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${meshHealth.score > 80 ? 'bg-emerald-400' :
                    meshHealth.score > 50 ? 'bg-amber-400' :
                      'bg-red-400'
                    }`}
                  style={{ width: `${meshHealth.score}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{meshHealth.status}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div className="bg-slate-900/50 rounded p-2 text-center">
              <div className="text-emerald-400 font-bold">{nodes.filter(n => n.isOnline).length}</div>
              <div className="text-slate-500">Online</div>
            </div>
            <div className="bg-slate-900/50 rounded p-2 text-center">
              <div className="text-amber-400 font-bold">{nodes.filter(n => !n.isOnline).length}</div>
              <div className="text-slate-500">Offline</div>
            </div>
            <div className="bg-slate-900/50 rounded p-2 text-center">
              <div className="text-blue-400 font-bold">
                {nodes.length > 0 ? Math.round(nodes.reduce((acc, n) => acc + (n.snr || 0), 0) / nodes.length) : 0}dB
              </div>
              <div className="text-slate-500">Avg SNR</div>
            </div>
          </div>
        </div>

        {/* Range Calculator */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold">Range Estimator</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Terrain</label>
              <div className="flex gap-1 flex-wrap">
                {TERRAIN_TYPES.map((terrain, idx) => {
                  const Icon = terrain.icon;
                  return (
                    <button
                      key={terrain.name}
                      onClick={() => setSelectedTerrain(idx)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${selectedTerrain === idx
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      title={terrain.description}
                    >
                      <Icon className="w-3 h-3" />
                      {terrain.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Power Output</label>
              <input
                type="range"
                min="10"
                max="27"
                value={selectedPower}
                onChange={(e) => setSelectedPower(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>10dBm</span>
                <span className="text-amber-400 font-bold">{selectedPower}dBm</span>
                <span>27dBm</span>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {Math.round(8 * (selectedPower / 20) * TERRAIN_TYPES[selectedTerrain].factor)} miles
              </div>
              <div className="text-xs text-slate-500">
                Estimated max range in {TERRAIN_TYPES[selectedTerrain].name}
              </div>
            </div>
          </div>
        </div>

        {/* Air Utilization & Channel Congestion */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">Channel Activity</h3>
          </div>

          <div className="space-y-3">
            {/* Air Utilization */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Air Utilization (TX)</span>
                <span className={airUtilization > 25 ? 'text-red-400' : airUtilization > 15 ? 'text-amber-400' : 'text-emerald-400'}>
                  {airUtilization}%
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${airUtilization > 25 ? 'bg-red-400' : airUtilization > 15 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${airUtilization}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {airUtilization > 25 ? '⚠️ Channel congested - reduce chatter' :
                  airUtilization > 15 ? 'Moderate activity' :
                    'Clear channel'}
              </div>
            </div>

            {/* Channel Utilization */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Channel Utilization</span>
                <span className={channelUtilization > 50 ? 'text-red-400' : channelUtilization > 25 ? 'text-amber-400' : 'text-emerald-400'}>
                  {channelUtilization}%
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${channelUtilization > 50 ? 'bg-red-400' : channelUtilization > 25 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${channelUtilization}%` }}
                />
              </div>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>Monitoring mesh traffic</span>
              <span className="text-slate-600">|</span>
              <span>{packetLog.length} packets logged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Packet Monitor */}
      {packetLog.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">Live Packet Monitor</h3>
            </div>
            <button
              onClick={() => setPacketLog([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="bg-slate-900 rounded-lg h-32 overflow-y-auto font-mono text-xs">
            <div className="p-2 space-y-1">
              {packetLog.slice(-20).map((packet, idx) => (
                <div key={packet.id} className="flex items-center gap-2 text-slate-300">
                  <span className="text-slate-500">{new Date(packet.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className={packet.type === 'text' ? 'text-emerald-400' : packet.type === 'position' ? 'text-blue-400' : 'text-purple-400'}>
                    {packet.type.toUpperCase()}
                  </span>
                  <span className="text-slate-400">{packet.from.slice(0, 8)}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-slate-400">{packet.to === 'broadcast' ? 'ALL' : packet.to.slice(0, 8)}</span>
                  <span className="text-slate-500">|</span>
                  <span className={packet.snr > 0 ? 'text-emerald-400' : 'text-amber-400'}>{packet.snr}dB</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-500">{packet.hops} hop{packet.hops !== 1 ? 's' : ''}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-500">{packet.size}b</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Node List & Map */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Network Nodes
          </h3>

          {nodes.map((node) => {
            const isExpanded = expandedNode === node.id;
            const signal = getSignalQuality(node.snr);
            const isMe = node.id === myNodeId;

            // Calculate distance and bearing from my position
            let distance = 0;
            let bearing = 0;
            let cardinal = 'N';
            if (node.lat && node.lng && myNode.lat && myNode.lng && !isMe) {
              distance = calculateDistance(myNode.lat, myNode.lng, node.lat, node.lng);
              bearing = calculateBearing(myNode.lat, myNode.lng, node.lat, node.lng);
              cardinal = getCardinal(bearing);
            }

            return (
              <div
                key={node.id}
                className={`bg-slate-800 rounded-xl border-2 overflow-hidden ${isMe ? 'border-blue-600' : node.isOnline ? 'border-slate-700' : 'border-slate-800'
                  }`}
              >
                <div
                  onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                  className="p-4 cursor-pointer hover:bg-slate-750 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isMe ? 'bg-blue-900/50 text-blue-400' :
                        node.isOnline ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                        <Radio className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{node.name}</h4>
                          {isMe && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">YOU</span>}
                          {!node.isOnline && <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded">OFFLINE</span>}
                        </div>
                        <p className="text-sm text-slate-400">{node.shortName} • {node.role}</p>

                        {node.isOnline && !isMe && (
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-slate-400">
                              {distance > 0 && `${distance} mi ${cardinal}`}
                            </span>
                            <span className={`${signal.color}`}>{signal.label}</span>
                            <span className="text-slate-500">{node.hopsAway} hop{node.hopsAway !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {node.batteryLevel !== undefined && (
                        <div className={`flex items-center gap-1 ${getBatteryColor(node.batteryLevel)}`}>
                          <Battery className="w-4 h-4" />
                          <span className="text-sm">{node.batteryLevel}%</span>
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-700 p-4 bg-slate-850">
                    {/* SNR History Sparkline */}
                    {node.snr !== undefined && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span>SNR History (last hour)</span>
                          <span className={signal.color}>{node.snr}dB current</span>
                        </div>
                        <div className="h-12 flex items-end gap-1">
                          {[...Array(20)].map((_, i) => {
                            // Generate mock SNR history based on current SNR
                            const baseSnr = node.snr || 0;
                            const variance = Math.sin(i * 0.5) * 3 + (Math.random() - 0.5) * 2;
                            const value = Math.max(-10, Math.min(15, baseSnr + variance));
                            const height = Math.max(10, ((value + 10) / 25) * 100);
                            const colorClass = value > 5 ? 'bg-emerald-400' : value > 0 ? 'bg-amber-400' : 'bg-red-400';
                            return (
                              <div
                                key={i}
                                className={`flex-1 rounded-t ${colorClass} opacity-60 hover:opacity-100 transition-opacity`}
                                style={{ height: `${height}%` }}
                                title={`${Math.round(value * 10) / 10}dB`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-xs text-slate-600 mt-1">
                          <span>-10dB</span>
                          <span>0dB</span>
                          <span>+15dB</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      {node.lat && node.lng && (
                        <>
                          <div>
                            <span className="text-slate-500">Lat:</span>
                            <span className="text-slate-300 ml-2 font-mono">{node.lat.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Lng:</span>
                            <span className="text-slate-300 ml-2 font-mono">{node.lng.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Altitude:</span>
                            <span className="text-slate-300 ml-2">{node.altitude}ft</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Voltage:</span>
                            <span className="text-slate-300 ml-2">{node.voltage}V</span>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-slate-500">Last Heard:</span>
                        <span className="text-slate-300 ml-2">{timeAgo(node.lastHeard)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">SNR:</span>
                        <span className={`ml-2 ${signal.color}`}>{node.snr}dB</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {node.lat && node.lng && (
                        <a
                          href={`https://www.google.com/maps?q=${node.lat},${node.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                          <MapPin className="w-3 h-3" />
                          View on Map
                        </a>
                      )}
                      {!isMe && (
                        <button
                          onClick={() => setSelectedNode(node.id)}
                          className="flex-1 text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Message
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Messages */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mesh Chat
          </h3>

          {/* Message List */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 h-96 overflow-y-auto">
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const sender = nodes.find(n => n.id === msg.from);
                  const isMe = msg.from === myNodeId;
                  const isBroadcast = msg.to === 'broadcast';

                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${isMe ? 'bg-blue-900/30 border border-blue-700/50' :
                        msg.isEmergency ? 'bg-red-900/50 border-2 border-red-500' :
                          'bg-slate-700/50 border border-slate-600'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {isMe ? 'You' : sender?.shortName || 'Unknown'}
                          </span>
                          {isBroadcast && <span className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">ALL</span>}
                          {msg.isEmergency && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`mt-1 ${msg.isEmergency ? 'text-red-200 font-medium' : 'text-slate-300'}`}>
                        {msg.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Send Message */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
            {/* Message Presets */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
              >
                {showPresets ? '▼' : '▶'} Quick Messages
              </button>
              {showPresets && MESSAGE_TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  onClick={() => setNewMessage(template.text)}
                  className={`text-xs ${template.color} hover:opacity-80 text-white px-2 py-1 rounded transition-colors`}
                >
                  {template.icon} {template.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <select
                title="Recipient"
                value={selectedNode}
                onChange={(e) => setSelectedNode(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="broadcast">📢 All Nodes</option>
                {nodes.filter(n => n.id !== myNodeId).map(n => (
                  <option key={n.id} value={n.id}>👤 {n.name}</option>
                ))}
              </select>
              <button
                onClick={() => setNewMessage('SOS - Need help!')}
                className="px-3 py-2 bg-red-900/50 text-red-400 border border-red-700/50 rounded-lg text-sm hover:bg-red-900 transition-colors"
              >
                🆘 SOS
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 rounded-lg transition-colors"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Battery Drain Estimator */}
            <div className="bg-slate-900/50 rounded-lg p-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Battery className="w-3 h-3" />
                <span>Est. battery: </span>
                <span className="text-emerald-400">
                  {nodes.find(n => n.id === myNodeId)?.batteryLevel || 85}%
                  ({Math.round((nodes.find(n => n.id === myNodeId)?.batteryLevel || 85) * 0.24)}h left)
                </span>
                <span className="text-slate-600">| TX every 5min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-400 mb-1">How Meshtastic Works</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Long-range LoRa radio (1-10+ miles)</li>
                <li>• No cell towers or internet required</li>
                <li>• Messages hop through other radios</li>
                <li>• GPS tracking of all group members</li>
                <li>• Works in remote wilderness</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Navigation className="w-5 h-5 text-emerald-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-emerald-400 mb-1">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {!showRadar && (
                  <button
                    onClick={() => setShowRadar(true)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors"
                  >
                    📡 Show Radar
                  </button>
                )}
                <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors">
                  📍 Drop Waypoint
                </button>
                <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors">
                  🔔 Test Alarm
                </button>
                <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors">
                  📊 Telemetry Only
                </button>
                <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors">
                  💤 Sleep Mode
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Channel/Frequency Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-400 mb-1">Radio Settings</h4>
              <div className="text-sm text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Frequency:</span>
                  <span>906.875 MHz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bandwidth:</span>
                  <span>250 kHz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spread Factor:</span>
                  <span>11 (2.05kbps)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Channel:</span>
                  <span>Long Range / Slow</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
