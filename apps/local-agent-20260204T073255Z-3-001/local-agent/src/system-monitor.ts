/**
 * System Monitor
 * Monitors system health and resources
 */

import si from 'systeminformation';
import os from 'os';

interface SystemInfo {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network: {
    interfaces: string[];
    connected: boolean;
  };
  os: {
    platform: string;
    release: string;
    uptime: number;
  };
  gpu?: {
    model: string;
    vram: number;
    temperature?: number;
  };
}

export class SystemMonitor {
  private lastCheck: SystemInfo | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  async getInfo(): Promise<SystemInfo> {
    try {
      const [cpu, mem, disk, network, graphics] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkInterfaces(),
        si.graphics(),
      ]);

      const mainDisk = disk[0] || { size: 0, used: 0, available: 0 };
      const mainGpu = graphics.controllers[0];

      this.lastCheck = {
        cpu: {
          usage: Math.round(cpu.currentLoad),
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'Unknown',
        },
        memory: {
          total: Math.round(mem.total / 1024 / 1024 / 1024),
          used: Math.round(mem.used / 1024 / 1024 / 1024),
          free: Math.round(mem.free / 1024 / 1024 / 1024),
          usagePercent: Math.round((mem.used / mem.total) * 100),
        },
        disk: {
          total: Math.round(mainDisk.size / 1024 / 1024 / 1024),
          used: Math.round(mainDisk.used / 1024 / 1024 / 1024),
          free: Math.round((mainDisk.size - mainDisk.used) / 1024 / 1024 / 1024),
          usagePercent: Math.round(mainDisk.use || 0),
        },
        network: {
          interfaces: (network as any[]).map((n: any) => n.iface),
          connected: (network as any[]).some((n: any) => n.operstate === 'up'),
        },
        os: {
          platform: os.platform(),
          release: os.release(),
          uptime: Math.round(os.uptime() / 3600), // hours
        },
        gpu: mainGpu
          ? {
              model: mainGpu.model,
              vram: mainGpu.vram || 0,
              temperature: mainGpu.temperatureGpu,
            }
          : undefined,
      };

      return this.lastCheck;
    } catch (error) {
      console.error('System monitor error:', error);
      return this.getFallbackInfo();
    }
  }

  async checkHealth(): Promise<{
    healthy: boolean;
    warnings: string[];
    critical: string[];
  }> {
    const info = await this.getInfo();
    const warnings: string[] = [];
    const critical: string[] = [];

    // CPU checks
    if (info.cpu.usage > 90) {
      critical.push(`CPU usage critical: ${info.cpu.usage}%`);
    } else if (info.cpu.usage > 70) {
      warnings.push(`CPU usage high: ${info.cpu.usage}%`);
    }

    // Memory checks
    if (info.memory.usagePercent > 90) {
      critical.push(`Memory usage critical: ${info.memory.usagePercent}%`);
    } else if (info.memory.usagePercent > 80) {
      warnings.push(`Memory usage high: ${info.memory.usagePercent}%`);
    }

    // Disk checks
    if (info.disk.usagePercent > 95) {
      critical.push(`Disk space critical: ${info.disk.usagePercent}%`);
    } else if (info.disk.usagePercent > 85) {
      warnings.push(`Disk space low: ${info.disk.usagePercent}%`);
    }

    // Network check
    if (!info.network.connected) {
      critical.push('No network connection');
    }

    // GPU temperature (if available)
    if (info.gpu?.temperature && info.gpu.temperature > 85) {
      warnings.push(`GPU temperature high: ${info.gpu.temperature}°C`);
    }

    return {
      healthy: critical.length === 0,
      warnings,
      critical,
    };
  }

  startMonitoring(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const health = await this.checkHealth();
      if (!health.healthy) {
        console.log('\n⚠️ SYSTEM HEALTH ALERT:');
        health.critical.forEach((c) => console.log(`   🔴 ${c}`));
        health.warnings.forEach((w) => console.log(`   🟡 ${w}`));
      }
    }, intervalMs);

    console.log(`🖥️ System monitoring started (interval: ${intervalMs / 1000}s)`);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🖥️ System monitoring stopped');
    }
  }

  getStatusString(): string {
    if (!this.lastCheck) return 'No system info available';

    const info = this.lastCheck;
    return `
╔═══════════════════════════════════════════════╗
║              🖥️ SYSTEM STATUS                  ║
╠═══════════════════════════════════════════════╣
║  CPU:    ${info.cpu.usage}% (${info.cpu.cores} cores)`.padEnd(46) + `║
║  Memory: ${info.memory.used}/${info.memory.total}GB (${info.memory.usagePercent}%)`.padEnd(46) + `║
║  Disk:   ${info.disk.used}/${info.disk.total}GB (${info.disk.usagePercent}%)`.padEnd(46) + `║
║  Uptime: ${info.os.uptime} hours`.padEnd(46) + `║
╚═══════════════════════════════════════════════╝`;
  }

  private getFallbackInfo(): SystemInfo {
    return {
      cpu: {
        usage: 0,
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
      },
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024 / 1024),
        usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      },
      disk: {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
      },
      network: {
        interfaces: [],
        connected: true,
      },
      os: {
        platform: os.platform(),
        release: os.release(),
        uptime: Math.round(os.uptime() / 3600),
      },
    };
  }
}

