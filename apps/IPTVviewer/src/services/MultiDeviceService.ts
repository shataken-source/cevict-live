/**
 * Multi-Device Service
 * Manage multiple simultaneous connections (3-5 devices per household)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Device {
  id: string;
  name: string;
  type: 'tv' | 'phone' | 'tablet' | 'firestick' | 'web';
  lastActive: Date;
  currentChannel?: string;
  ipAddress?: string;
  isActive: boolean;
}

export interface DeviceSession {
  deviceId: string;
  sessionId: string;
  startedAt: Date;
  lastHeartbeat: Date;
  channelId?: string;
  quality?: string;
}

export class MultiDeviceService {
  private static readonly STORAGE_KEY_DEVICES = 'registered_devices';
  private static readonly STORAGE_KEY_SESSIONS = 'active_sessions';
  private static readonly MAX_CONNECTIONS = 5;
  private static readonly SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Register a new device
   */
  static async registerDevice(
    name: string,
    type: Device['type']
  ): Promise<Device> {
    const device: Device = {
      id: `device-${Date.now()}`,
      name,
      type,
      lastActive: new Date(),
      isActive: false,
    };

    const devices = await this.getDevices();
    devices.push(device);
    await this.saveDevices(devices);

    return device;
  }

  /**
   * Start a session on a device
   */
  static async startSession(deviceId: string): Promise<DeviceSession | null> {
    const activeSessions = await this.getActiveSessions();
    
    // Check if max connections reached
    if (activeSessions.length >= this.MAX_CONNECTIONS) {
      console.warn(`Max connections (${this.MAX_CONNECTIONS}) reached`);
      return null;
    }

    // Check if device already has active session
    const existingSession = activeSessions.find(s => s.deviceId === deviceId);
    if (existingSession) {
      return existingSession;
    }

    const session: DeviceSession = {
      deviceId,
      sessionId: `session-${Date.now()}`,
      startedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    activeSessions.push(session);
    await this.saveSessions(activeSessions);

    // Update device status
    const devices = await this.getDevices();
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      device.isActive = true;
      device.lastActive = new Date();
      await this.saveDevices(devices);
    }

    return session;
  }

  /**
   * End a session
   */
  static async endSession(sessionId: string): Promise<void> {
    const sessions = await this.getActiveSessions();
    const session = sessions.find(s => s.sessionId === sessionId);
    
    if (session) {
      // Update device status
      const devices = await this.getDevices();
      const device = devices.find(d => d.id === session.deviceId);
      if (device) {
        device.isActive = false;
        device.lastActive = new Date();
        await this.saveDevices(devices);
      }

      // Remove session
      const filtered = sessions.filter(s => s.sessionId !== sessionId);
      await this.saveSessions(filtered);
    }
  }

  /**
   * Update session heartbeat
   */
  static async updateHeartbeat(
    sessionId: string,
    channelId?: string,
    quality?: string
  ): Promise<void> {
    const sessions = await this.getActiveSessions();
    const session = sessions.find(s => s.sessionId === sessionId);
    
    if (session) {
      session.lastHeartbeat = new Date();
      if (channelId) session.channelId = channelId;
      if (quality) session.quality = quality;
      await this.saveSessions(sessions);
    }
  }

  /**
   * Clean up stale sessions (no heartbeat for 5+ minutes)
   */
  static async cleanupStaleSessions(): Promise<void> {
    const sessions = await this.getActiveSessions();
    const now = Date.now();
    
    const activeSessions = sessions.filter(s => {
      const lastHeartbeat = new Date(s.lastHeartbeat).getTime();
      return (now - lastHeartbeat) < this.SESSION_TIMEOUT_MS;
    });

    // Update device statuses for removed sessions
    const removedSessions = sessions.filter(s => !activeSessions.includes(s));
    if (removedSessions.length > 0) {
      const devices = await this.getDevices();
      removedSessions.forEach(session => {
        const device = devices.find(d => d.id === session.deviceId);
        if (device) {
          device.isActive = false;
        }
      });
      await this.saveDevices(devices);
    }

    await this.saveSessions(activeSessions);
  }

  /**
   * Get all registered devices
   */
  static async getDevices(): Promise<Device[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY_DEVICES);
      if (!data) return [];

      const devices: Device[] = JSON.parse(data);
      return devices.map(d => ({
        ...d,
        lastActive: new Date(d.lastActive),
      }));
    } catch (error) {
      console.error('Error loading devices:', error);
      return [];
    }
  }

  /**
   * Get active sessions
   */
  static async getActiveSessions(): Promise<DeviceSession[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY_SESSIONS);
      if (!data) return [];

      const sessions: DeviceSession[] = JSON.parse(data);
      return sessions.map(s => ({
        ...s,
        startedAt: new Date(s.startedAt),
        lastHeartbeat: new Date(s.lastHeartbeat),
      }));
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  /**
   * Get connection usage
   */
  static async getConnectionUsage(): Promise<{
    active: number;
    max: number;
    available: number;
    percentage: number;
  }> {
    await this.cleanupStaleSessions();
    const sessions = await this.getActiveSessions();
    
    return {
      active: sessions.length,
      max: this.MAX_CONNECTIONS,
      available: this.MAX_CONNECTIONS - sessions.length,
      percentage: Math.round((sessions.length / this.MAX_CONNECTIONS) * 100),
    };
  }

  /**
   * Check if new connection is allowed
   */
  static async canConnect(): Promise<boolean> {
    const usage = await this.getConnectionUsage();
    return usage.available > 0;
  }

  /**
   * Get devices by type
   */
  static async getDevicesByType(type: Device['type']): Promise<Device[]> {
    const devices = await this.getDevices();
    return devices.filter(d => d.type === type);
  }

  /**
   * Remove a device
   */
  static async removeDevice(deviceId: string): Promise<void> {
    // End any active sessions for this device
    const sessions = await this.getActiveSessions();
    const deviceSessions = sessions.filter(s => s.deviceId === deviceId);
    for (const session of deviceSessions) {
      await this.endSession(session.sessionId);
    }

    // Remove device
    const devices = await this.getDevices();
    const filtered = devices.filter(d => d.id !== deviceId);
    await this.saveDevices(filtered);
  }

  /**
   * Rename a device
   */
  static async renameDevice(deviceId: string, newName: string): Promise<void> {
    const devices = await this.getDevices();
    const device = devices.find(d => d.id === deviceId);
    
    if (device) {
      device.name = newName;
      await this.saveDevices(devices);
    }
  }

  /**
   * Get session for device
   */
  static async getSessionForDevice(deviceId: string): Promise<DeviceSession | null> {
    const sessions = await this.getActiveSessions();
    return sessions.find(s => s.deviceId === deviceId) || null;
  }

  /**
   * Save devices to storage
   */
  private static async saveDevices(devices: Device[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY_DEVICES,
        JSON.stringify(devices)
      );
    } catch (error) {
      console.error('Error saving devices:', error);
    }
  }

  /**
   * Save sessions to storage
   */
  private static async saveSessions(sessions: DeviceSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY_SESSIONS,
        JSON.stringify(sessions)
      );
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  /**
   * Clear all devices
   */
  static async clearAllDevices(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY_DEVICES);
      await AsyncStorage.removeItem(this.STORAGE_KEY_SESSIONS);
    } catch (error) {
      console.error('Error clearing devices:', error);
    }
  }
}
