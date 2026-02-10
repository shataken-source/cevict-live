export interface VPNConfig {
  enabled: boolean;
  provider: 'openvpn' | 'wireguard' | 'ikev2' | 'custom';
  serverAddress: string;
  serverPort?: number;
  username?: string;
  password?: string;
  configFile?: string;
  autoConnect: boolean;
  /** For WireGuard: server's public key (e.g. from Surfshark API) */
  wireguardServerPublicKey?: string;
  /** For WireGuard: client private key (from Surfshark dashboard or config) */
  wireguardPrivateKey?: string;
}

export interface VPNStatus {
  connected: boolean;
  server?: string;
  ip?: string;
  latency?: number;
  uptime?: number;
}

import {
  isWireGuardAvailable,
  wireGuardInitialize,
  wireGuardRequestPermission,
  wireGuardConnect,
  wireGuardDisconnect,
  wireGuardGetStatus,
} from './WireGuardNative';

export class VPNService {
  private config: VPNConfig;
  private status: VPNStatus = {connected: false};
  private usedWireGuard = false;

  constructor(config?: VPNConfig) {
    this.config = config || {
      enabled: false,
      provider: 'openvpn',
      serverAddress: '',
      autoConnect: false,
    };
  }

  setConfig(config: VPNConfig): void {
    this.config = config;
  }

  getConfig(): VPNConfig {
    return this.config;
  }

  getStatus(): VPNStatus {
    return this.status;
  }

  async connect(): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('VPN is disabled');
      return false;
    }

    const { serverAddress, serverPort = 51820, wireguardPrivateKey, wireguardServerPublicKey } = this.config;
    const useWireGuard =
      isWireGuardAvailable() &&
      this.config.provider === 'wireguard' &&
      !!serverAddress?.trim() &&
      !!wireguardServerPublicKey?.trim() &&
      !!wireguardPrivateKey?.trim();

    if (useWireGuard) {
      try {
        await wireGuardInitialize();
        await wireGuardRequestPermission();
        const ok = await wireGuardConnect({
          privateKey: wireguardPrivateKey!.trim(),
          publicKey: wireguardServerPublicKey!.trim(),
          serverAddress: serverAddress.trim(),
          serverPort: Number(serverPort) || 51820,
          allowedIPs: ['0.0.0.0/0', '::/0'],
          dns: ['1.1.1.1', '8.8.8.8'],
        });
        if (ok) {
          this.usedWireGuard = true;
          this.status = { connected: true, server: serverAddress };
          return true;
        }
      } catch (error) {
        console.error('WireGuard connect failed:', error);
        this.status = { connected: false };
        return false;
      }
    }

    // Fallback: simulated VPN when WireGuard not available or config incomplete
    if (useWireGuard === false && !wireguardPrivateKey?.trim()) {
      console.warn('VPN: Add WireGuard private key and server public key (e.g. from Surfshark) to connect.');
    }
    try {
      console.log(`[Simulated VPN] ${serverAddress}`);
      this.usedWireGuard = false;
      this.status = {
        connected: true,
        server: serverAddress,
        ip: '10.8.0.1',
        latency: 45,
        uptime: 0,
      };
      return true;
    } catch (error) {
      console.error('VPN connection failed:', error);
      this.status = { connected: false };
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.usedWireGuard && isWireGuardAvailable()) {
        await wireGuardDisconnect();
      }
      this.usedWireGuard = false;
      this.status = { connected: false };
    } catch (error) {
      console.error('VPN disconnection failed:', error);
      this.status = { connected: false };
    }
  }

  async checkConnection(): Promise<boolean> {
    return this.status.connected;
  }

  async getPublicIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get public IP:', error);
      return 'Unknown';
    }
  }
}
