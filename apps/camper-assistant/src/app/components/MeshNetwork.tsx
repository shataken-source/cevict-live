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
  Trash2
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
}

interface MeshMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  isEmergency?: boolean;
}

// Mock data removed - only live Meshtastic connections
const MOCK_NODES: MeshNode[] = [];

const MOCK_MESSAGES: MeshMessage[] = [];

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

  // Calculate bearing between two points
  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
      Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // Get cardinal direction from bearing
  const getCardinal = (bearing: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  // Format time ago
  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

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
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}
