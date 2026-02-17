/**
 * Optional bridge to react-native-wireguard-vpn-connect.
 * If the native module is not linked, all methods no-op and return false / empty status.
 * @see https://www.npmjs.com/package/react-native-wireguard-vpn-connect
 */

export interface WireGuardConfig {
  privateKey: string;
  publicKey: string;
  serverAddress: string;
  serverPort: number;
  allowedIPs: string[];
  dns?: string[];
  mtu?: number;
  presharedKey?: string;
}

export interface WireGuardStatus {
  isConnected: boolean;
  tunnelState: 'UP' | 'DOWN' | 'UNKNOWN' | 'ERROR';
  error?: string;
  vpnPermissionGranted?: boolean;
}

let WireGuard: {
  initialize(): Promise<void>;
  requestVpnPermission(): Promise<void>;
  connect(config: WireGuardConfig): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<WireGuardStatus>;
  isSupported(): Promise<boolean>;
} | null = null;

try {
  WireGuard = require('react-native-wireguard-vpn-connect').default;
} catch {
  // Native module not installed or not linked
}

export const isWireGuardAvailable = (): boolean => !!WireGuard;

export async function wireGuardInitialize(): Promise<boolean> {
  if (!WireGuard) return false;
  try {
    await WireGuard.initialize();
    return true;
  } catch {
    return false;
  }
}

export async function wireGuardRequestPermission(): Promise<boolean> {
  if (!WireGuard) return false;
  try {
    await WireGuard.requestVpnPermission();
    return true;
  } catch {
    return false;
  }
}

export async function wireGuardConnect(config: WireGuardConfig): Promise<boolean> {
  if (!WireGuard) return false;
  try {
    await WireGuard.connect(config);
    return true;
  } catch {
    return false;
  }
}

export async function wireGuardDisconnect(): Promise<boolean> {
  if (!WireGuard) return false;
  try {
    await WireGuard.disconnect();
    return true;
  } catch {
    return false;
  }
}

export async function wireGuardGetStatus(): Promise<WireGuardStatus | null> {
  if (!WireGuard) return null;
  try {
    return await WireGuard.getStatus();
  } catch {
    return null;
  }
}

export async function wireGuardIsSupported(): Promise<boolean> {
  if (!WireGuard) return false;
  try {
    return await WireGuard.isSupported();
  } catch {
    return false;
  }
}
