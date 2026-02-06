/**
 * Bluetooth Scanner
 * Scans for nearby Bluetooth devices using system commands
 * Works on Windows, Mac, and Linux
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

interface BluetoothDevice {
  name: string;
  address: string;
  type: 'classic' | 'ble' | 'unknown';
  rssi?: number;
  connected?: boolean;
  paired?: boolean;
}

interface ScanResult {
  success: boolean;
  devices: BluetoothDevice[];
  timestamp: string;
  platform: string;
  error?: string;
}

export class BluetoothScanner {
  private platform: string;

  constructor() {
    this.platform = os.platform();
  }

  /**
   * Scan for Bluetooth devices
   */
  async scan(): Promise<ScanResult> {
    console.log('📶 Scanning for Bluetooth devices...\n');

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
            devices: [],
            timestamp: new Date().toISOString(),
            platform: this.platform,
            error: `Unsupported platform: ${this.platform}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        devices: [],
        timestamp: new Date().toISOString(),
        platform: this.platform,
        error: error.message,
      };
    }
  }

  /**
   * Scan on Windows using PowerShell
   */
  private async scanWindows(): Promise<ScanResult> {
    const devices: BluetoothDevice[] = [];

    try {
      // Get paired devices
      const pairedCmd = `
        Get-PnpDevice -Class Bluetooth | 
        Where-Object { $_.Status -eq 'OK' } | 
        Select-Object FriendlyName, InstanceId, Status | 
        ConvertTo-Json
      `;
      
      const { stdout: pairedOutput } = await execAsync(
        `powershell -Command "${pairedCmd}"`,
        { windowsHide: true }
      );

      if (pairedOutput.trim()) {
        const pairedDevices = JSON.parse(pairedOutput);
        const deviceList = Array.isArray(pairedDevices) ? pairedDevices : [pairedDevices];
        
        for (const device of deviceList) {
          if (device.FriendlyName && !device.FriendlyName.includes('Microsoft')) {
            devices.push({
              name: device.FriendlyName,
              address: this.extractAddress(device.InstanceId) || 'Unknown',
              type: 'classic',
              paired: true,
              connected: device.Status === 'OK',
            });
          }
        }
      }

      // Try to get BLE devices
      const bleCmd = `
        Get-PnpDevice -Class 'Bluetooth' -PresentOnly | 
        Where-Object { $_.FriendlyName -notlike '*Radio*' -and $_.FriendlyName -notlike '*Microsoft*' } |
        Select-Object FriendlyName, InstanceId |
        ConvertTo-Json
      `;

      try {
        const { stdout: bleOutput } = await execAsync(
          `powershell -Command "${bleCmd}"`,
          { windowsHide: true }
        );

        if (bleOutput.trim()) {
          const bleDevices = JSON.parse(bleOutput);
          const bleList = Array.isArray(bleDevices) ? bleDevices : [bleDevices];
          
          for (const device of bleList) {
            // Avoid duplicates
            if (device.FriendlyName && !devices.find(d => d.name === device.FriendlyName)) {
              devices.push({
                name: device.FriendlyName,
                address: this.extractAddress(device.InstanceId) || 'Unknown',
                type: 'ble',
                paired: false,
              });
            }
          }
        }
      } catch {
        // BLE scan might fail, continue with classic devices
      }

      console.log(`✅ Found ${devices.length} Bluetooth devices\n`);
      devices.forEach(d => {
        console.log(`   📱 ${d.name} (${d.address}) - ${d.connected ? '🟢 Connected' : '⚪ Paired'}`);
      });

      return {
        success: true,
        devices,
        timestamp: new Date().toISOString(),
        platform: 'windows',
      };
    } catch (error: any) {
      return {
        success: false,
        devices,
        timestamp: new Date().toISOString(),
        platform: 'windows',
        error: error.message,
      };
    }
  }

  /**
   * Scan on Mac using system_profiler
   */
  private async scanMac(): Promise<ScanResult> {
    const devices: BluetoothDevice[] = [];

    try {
      const { stdout } = await execAsync(
        'system_profiler SPBluetoothDataType -json',
        { maxBuffer: 1024 * 1024 }
      );

      const data = JSON.parse(stdout);
      const btData = data.SPBluetoothDataType?.[0];

      if (btData?.device_connected) {
        for (const [name, info] of Object.entries(btData.device_connected)) {
          const deviceInfo = info as any;
          devices.push({
            name,
            address: deviceInfo.device_address || 'Unknown',
            type: deviceInfo.device_minorType?.includes('LE') ? 'ble' : 'classic',
            connected: true,
            rssi: deviceInfo.device_rssi,
          });
        }
      }

      if (btData?.device_not_connected) {
        for (const [name, info] of Object.entries(btData.device_not_connected)) {
          const deviceInfo = info as any;
          devices.push({
            name,
            address: deviceInfo.device_address || 'Unknown',
            type: deviceInfo.device_minorType?.includes('LE') ? 'ble' : 'classic',
            connected: false,
            paired: true,
          });
        }
      }

      console.log(`✅ Found ${devices.length} Bluetooth devices\n`);

      return {
        success: true,
        devices,
        timestamp: new Date().toISOString(),
        platform: 'mac',
      };
    } catch (error: any) {
      return {
        success: false,
        devices,
        timestamp: new Date().toISOString(),
        platform: 'mac',
        error: error.message,
      };
    }
  }

  /**
   * Scan on Linux using bluetoothctl
   */
  private async scanLinux(): Promise<ScanResult> {
    const devices: BluetoothDevice[] = [];

    try {
      // Get paired devices
      const { stdout: pairedOutput } = await execAsync(
        'bluetoothctl devices Paired 2>/dev/null || bluetoothctl paired-devices 2>/dev/null || echo ""'
      );

      const lines = pairedOutput.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const match = line.match(/Device\s+([0-9A-F:]+)\s+(.+)/i);
        if (match) {
          devices.push({
            name: match[2],
            address: match[1],
            type: 'classic',
            paired: true,
          });
        }
      }

      // Check connected status
      const { stdout: connectedOutput } = await execAsync(
        'bluetoothctl devices Connected 2>/dev/null || echo ""'
      );

      const connectedAddresses = new Set<string>();
      for (const line of connectedOutput.split('\n')) {
        const match = line.match(/Device\s+([0-9A-F:]+)/i);
        if (match) {
          connectedAddresses.add(match[1]);
        }
      }

      devices.forEach(d => {
        d.connected = connectedAddresses.has(d.address);
      });

      console.log(`✅ Found ${devices.length} Bluetooth devices\n`);

      return {
        success: true,
        devices,
        timestamp: new Date().toISOString(),
        platform: 'linux',
      };
    } catch (error: any) {
      return {
        success: false,
        devices,
        timestamp: new Date().toISOString(),
        platform: 'linux',
        error: error.message,
      };
    }
  }

  /**
   * Extract Bluetooth address from Windows InstanceId
   */
  private extractAddress(instanceId: string): string | null {
    if (!instanceId) return null;
    
    // Windows format: BTHENUM\{...}_VID&...&PID&...\7&...&0&XX:XX:XX:XX:XX:XX_...
    const match = instanceId.match(/([0-9A-F]{2}[_:]){5}[0-9A-F]{2}/i);
    if (match) {
      return match[0].replace(/_/g, ':');
    }
    
    // Alternative format
    const altMatch = instanceId.match(/&([0-9A-F]{12})_/i);
    if (altMatch) {
      const hex = altMatch[1];
      return hex.match(/.{2}/g)?.join(':') || null;
    }
    
    return null;
  }

  /**
   * Get Bluetooth adapter status
   */
  async getAdapterStatus(): Promise<{
    available: boolean;
    enabled: boolean;
    name?: string;
    address?: string;
  }> {
    try {
      switch (this.platform) {
        case 'win32': {
          const { stdout } = await execAsync(
            `powershell -Command "Get-PnpDevice -Class Bluetooth | Where-Object { $_.FriendlyName -like '*Radio*' -or $_.FriendlyName -like '*Adapter*' } | Select-Object FriendlyName, Status | ConvertTo-Json"`,
            { windowsHide: true }
          );
          
          if (stdout.trim()) {
            const adapter = JSON.parse(stdout);
            const adapterData = Array.isArray(adapter) ? adapter[0] : adapter;
            return {
              available: true,
              enabled: adapterData.Status === 'OK',
              name: adapterData.FriendlyName,
            };
          }
          return { available: false, enabled: false };
        }

        case 'darwin': {
          const { stdout } = await execAsync('system_profiler SPBluetoothDataType -json');
          const data = JSON.parse(stdout);
          const btData = data.SPBluetoothDataType?.[0];
          return {
            available: !!btData,
            enabled: btData?.controller_properties?.controller_state === 'attrib_on',
            address: btData?.controller_properties?.controller_address,
          };
        }

        case 'linux': {
          const { stdout } = await execAsync('bluetoothctl show 2>/dev/null || echo ""');
          const powered = stdout.includes('Powered: yes');
          return {
            available: stdout.length > 0,
            enabled: powered,
          };
        }

        default:
          return { available: false, enabled: false };
      }
    } catch {
      return { available: false, enabled: false };
    }
  }

  /**
   * Enable Bluetooth adapter (requires admin/root)
   */
  async enableBluetooth(): Promise<{ success: boolean; message: string }> {
    try {
      switch (this.platform) {
        case 'win32': {
          // Windows requires GUI or Device Manager
          return {
            success: false,
            message: 'On Windows, enable Bluetooth via Settings > Bluetooth & devices',
          };
        }

        case 'darwin': {
          await execAsync('blueutil -p 1');
          return { success: true, message: 'Bluetooth enabled' };
        }

        case 'linux': {
          await execAsync('bluetoothctl power on');
          return { success: true, message: 'Bluetooth enabled' };
        }

        default:
          return { success: false, message: 'Unsupported platform' };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

