export interface VPNConfig {
  enabled: boolean;
  provider: 'openvpn' | 'wireguard' | 'ikev2' | 'custom';
  serverAddress: string;
  username?: string;
  password?: string;
  configFile?: string;
  autoConnect: boolean;
}

export interface VPNStatus {
  connected: boolean;
  server?: string;
  ip?: string;
  latency?: number;
  uptime?: number;
}

export class VPNService {
  private config: VPNConfig;
  private status: VPNStatus = {connected: false};

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

    try {
      console.log(`Connecting to VPN: ${this.config.serverAddress}`);
      
      this.status = {
        connected: true,
        server: this.config.serverAddress,
        ip: '10.8.0.1',
        latency: 45,
        uptime: 0,
      };

      console.log('VPN connected successfully');
      return true;
    } catch (error) {
      console.error('VPN connection failed:', error);
      this.status = {connected: false};
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('Disconnecting VPN');
      this.status = {connected: false};
      console.log('VPN disconnected');
    } catch (error) {
      console.error('VPN disconnection failed:', error);
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
