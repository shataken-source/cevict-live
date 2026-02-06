/**
 * WiFi Scanner
 * Scans for nearby WiFi networks and provides security analysis
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

interface WiFiNetwork {
  ssid: string;
  bssid: string;
  signal: number;
  channel: number;
  frequency: string;
  security: string;
  securityRating: 'secure' | 'moderate' | 'weak' | 'open';
  band: '2.4GHz' | '5GHz' | '6GHz';
}

interface ScanResult {
  success: boolean;
  networks: WiFiNetwork[];
  timestamp: string;
  interface?: string;
  error?: string;
}

export class WiFiScanner {
  private platform: string;

  constructor() {
    this.platform = os.platform();
  }

  /**
   * Scan for WiFi networks
   */
  async scan(): Promise<ScanResult> {
    console.log('📡 Scanning for WiFi networks...\n');

    try {
      switch (this.platform) {
        case 'win32':
          return this.scanWindows();
        case 'darwin':
          return this.scanMac();
        case 'linux':
          return this.scanLinux();
        default:
          return {
            success: false,
            networks: [],
            timestamp: new Date().toISOString(),
            error: `Unsupported platform: ${this.platform}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        networks: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Scan on Windows
   */
  private async scanWindows(): Promise<ScanResult> {
    const networks: WiFiNetwork[] = [];

    try {
      const { stdout } = await execAsync(
        'netsh wlan show networks mode=bssid',
        { windowsHide: true }
      );

      const blocks = stdout.split(/SSID \d+ :/);
      
      for (const block of blocks.slice(1)) {
        const ssidMatch = block.match(/^\s*(.+)/);
        const bssidMatch = block.match(/BSSID \d+\s*:\s*([0-9a-fA-F:]+)/);
        const signalMatch = block.match(/Signal\s*:\s*(\d+)%/);
        const channelMatch = block.match(/Channel\s*:\s*(\d+)/);
        const authMatch = block.match(/Authentication\s*:\s*(.+)/);
        const encryptMatch = block.match(/Encryption\s*:\s*(.+)/);

        if (ssidMatch) {
          const ssid = ssidMatch[1].trim();
          const signal = signalMatch ? parseInt(signalMatch[1]) : 0;
          const channel = channelMatch ? parseInt(channelMatch[1]) : 0;
          const auth = authMatch ? authMatch[1].trim() : 'Unknown';
          const encrypt = encryptMatch ? encryptMatch[1].trim() : 'Unknown';

          const security = `${auth}/${encrypt}`;
          
          networks.push({
            ssid: ssid || '(Hidden)',
            bssid: bssidMatch ? bssidMatch[1] : 'Unknown',
            signal,
            channel,
            frequency: this.channelToFreq(channel),
            security,
            securityRating: this.rateSecurityWindows(auth, encrypt),
            band: channel > 14 ? (channel > 177 ? '6GHz' : '5GHz') : '2.4GHz',
          });
        }
      }

      // Sort by signal strength
      networks.sort((a, b) => b.signal - a.signal);

      console.log(`✅ Found ${networks.length} WiFi networks\n`);
      this.printNetworks(networks);

      return {
        success: true,
        networks,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        networks: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Scan on Mac
   */
  private async scanMac(): Promise<ScanResult> {
    const networks: WiFiNetwork[] = [];

    try {
      const { stdout } = await execAsync(
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s'
      );

      const lines = stdout.split('\n').slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        // Parse airport output format
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 7) {
          const ssid = parts[0];
          const bssid = parts[1];
          const rssi = parseInt(parts[2]);
          const channel = parseInt(parts[3]);
          const security = parts.slice(6).join(' ');

          const signal = Math.min(100, Math.max(0, (rssi + 100) * 2));

          networks.push({
            ssid: ssid || '(Hidden)',
            bssid,
            signal,
            channel,
            frequency: this.channelToFreq(channel),
            security,
            securityRating: this.rateSecurityMac(security),
            band: channel > 14 ? (channel > 177 ? '6GHz' : '5GHz') : '2.4GHz',
          });
        }
      }

      networks.sort((a, b) => b.signal - a.signal);

      console.log(`✅ Found ${networks.length} WiFi networks\n`);
      this.printNetworks(networks);

      return {
        success: true,
        networks,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        networks: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Scan on Linux
   */
  private async scanLinux(): Promise<ScanResult> {
    const networks: WiFiNetwork[] = [];

    try {
      // Try nmcli first
      const { stdout } = await execAsync(
        'nmcli -t -f SSID,BSSID,SIGNAL,CHAN,SECURITY device wifi list 2>/dev/null || iwlist scan 2>/dev/null'
      );

      if (stdout.includes(':')) {
        // nmcli format
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const [ssid, bssid, signal, channel, security] = line.split(':');
          
          const chan = parseInt(channel) || 0;
          networks.push({
            ssid: ssid || '(Hidden)',
            bssid: bssid || 'Unknown',
            signal: parseInt(signal) || 0,
            channel: chan,
            frequency: this.channelToFreq(chan),
            security: security || 'Unknown',
            securityRating: this.rateSecurityLinux(security),
            band: chan > 14 ? (chan > 177 ? '6GHz' : '5GHz') : '2.4GHz',
          });
        }
      }

      networks.sort((a, b) => b.signal - a.signal);

      console.log(`✅ Found ${networks.length} WiFi networks\n`);
      this.printNetworks(networks);

      return {
        success: true,
        networks,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        networks: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Analyze network security
   */
  async analyzeSecurityThreats(): Promise<{
    openNetworks: WiFiNetwork[];
    weakNetworks: WiFiNetwork[];
    suspiciousNetworks: WiFiNetwork[];
    recommendations: string[];
  }> {
    const result = await this.scan();
    
    const openNetworks = result.networks.filter(n => n.securityRating === 'open');
    const weakNetworks = result.networks.filter(n => n.securityRating === 'weak');
    
    // Detect potential evil twins (same SSID, different BSSID)
    const ssidGroups = new Map<string, WiFiNetwork[]>();
    for (const network of result.networks) {
      const existing = ssidGroups.get(network.ssid) || [];
      existing.push(network);
      ssidGroups.set(network.ssid, existing);
    }
    
    const suspiciousNetworks: WiFiNetwork[] = [];
    for (const [ssid, nets] of ssidGroups) {
      if (nets.length > 1 && ssid !== '(Hidden)') {
        // Multiple networks with same SSID - potential evil twin
        suspiciousNetworks.push(...nets);
      }
    }

    const recommendations: string[] = [];
    
    if (openNetworks.length > 0) {
      recommendations.push(`⚠️ ${openNetworks.length} open networks detected - avoid connecting without VPN`);
    }
    
    if (weakNetworks.length > 0) {
      recommendations.push(`⚠️ ${weakNetworks.length} networks with weak security (WEP/WPA) detected`);
    }
    
    if (suspiciousNetworks.length > 0) {
      recommendations.push(`🚨 ${suspiciousNetworks.length / 2} potential evil twin attacks detected (duplicate SSIDs)`);
    }

    return {
      openNetworks,
      weakNetworks,
      suspiciousNetworks,
      recommendations,
    };
  }

  /**
   * Get channel congestion analysis
   */
  async analyzeChannels(): Promise<{
    channel: number;
    count: number;
    congestion: 'low' | 'medium' | 'high';
  }[]> {
    const result = await this.scan();
    
    const channelCounts = new Map<number, number>();
    for (const network of result.networks) {
      channelCounts.set(network.channel, (channelCounts.get(network.channel) || 0) + 1);
    }

    const analysis = Array.from(channelCounts.entries()).map(([channel, count]) => ({
      channel,
      count,
      congestion: count > 5 ? 'high' as const : count > 2 ? 'medium' as const : 'low' as const,
    }));

    return analysis.sort((a, b) => a.channel - b.channel);
  }

  /**
   * Find best channel
   */
  async findBestChannel(band: '2.4GHz' | '5GHz' = '2.4GHz'): Promise<{
    recommended: number;
    reason: string;
  }> {
    const result = await this.scan();
    
    const channels = band === '2.4GHz' ? [1, 6, 11] : [36, 40, 44, 48, 149, 153, 157, 161];
    const channelCounts = new Map<number, number>();
    
    for (const ch of channels) {
      channelCounts.set(ch, 0);
    }
    
    for (const network of result.networks) {
      if (channels.includes(network.channel)) {
        channelCounts.set(network.channel, (channelCounts.get(network.channel) || 0) + 1);
      }
    }

    let bestChannel = channels[0];
    let lowestCount = Infinity;
    
    for (const [channel, count] of channelCounts) {
      if (count < lowestCount) {
        lowestCount = count;
        bestChannel = channel;
      }
    }

    return {
      recommended: bestChannel,
      reason: `Channel ${bestChannel} has only ${lowestCount} networks (least congested)`,
    };
  }

  // Helper functions
  private channelToFreq(channel: number): string {
    if (channel <= 14) {
      return `${2407 + channel * 5} MHz`;
    } else if (channel <= 177) {
      return `${5000 + channel * 5} MHz`;
    } else {
      return `${5950 + channel * 5} MHz`;
    }
  }

  private rateSecurityWindows(auth: string, encrypt: string): WiFiNetwork['securityRating'] {
    if (auth.includes('Open') || encrypt === 'None') return 'open';
    if (auth.includes('WEP') || encrypt.includes('WEP')) return 'weak';
    if (auth.includes('WPA2') || auth.includes('WPA3')) return 'secure';
    if (auth.includes('WPA')) return 'moderate';
    return 'moderate';
  }

  private rateSecurityMac(security: string): WiFiNetwork['securityRating'] {
    if (!security || security === '--' || security.includes('NONE')) return 'open';
    if (security.includes('WEP')) return 'weak';
    if (security.includes('WPA3') || security.includes('WPA2')) return 'secure';
    if (security.includes('WPA')) return 'moderate';
    return 'moderate';
  }

  private rateSecurityLinux(security: string): WiFiNetwork['securityRating'] {
    if (!security || security === '' || security === '--') return 'open';
    if (security.includes('WEP')) return 'weak';
    if (security.includes('WPA3') || security.includes('WPA2')) return 'secure';
    if (security.includes('WPA')) return 'moderate';
    return 'moderate';
  }

  private printNetworks(networks: WiFiNetwork[]): void {
    for (const net of networks.slice(0, 15)) {
      const secIcon = {
        secure: '🔒',
        moderate: '🔐',
        weak: '⚠️',
        open: '🔓',
      }[net.securityRating];
      
      const signalBars = net.signal > 80 ? '████' : net.signal > 60 ? '███░' : net.signal > 40 ? '██░░' : net.signal > 20 ? '█░░░' : '░░░░';
      
      console.log(`   ${secIcon} ${net.ssid.padEnd(25)} ${signalBars} ${net.signal}% Ch${net.channel} ${net.band}`);
    }
    
    if (networks.length > 15) {
      console.log(`   ... and ${networks.length - 15} more networks`);
    }
  }
}

