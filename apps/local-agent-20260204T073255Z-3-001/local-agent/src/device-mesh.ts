/**
 * Device Mesh Network
 * Coordinates communication between all devices through a gatekeeper/validator
 */

import { createServer, Server } from 'http';
import express, { Express, Request, Response } from 'express';
import crypto from 'crypto';

interface DeviceInfo {
  id: string;
  name: string;
  type: 'laptop' | 'desktop' | 'phone' | 'tablet' | 'server' | 'iot' | 'unknown';
  ip: string;
  lastSeen: Date;
  status: 'online' | 'offline' | 'pending';
  capabilities: string[];
  publicKey?: string;
}

interface Message {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: 'command' | 'response' | 'sync' | 'heartbeat' | 'alert';
  payload: any;
  timestamp: Date;
  signature?: string;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  deviceInfo?: DeviceInfo;
}

export class DeviceMeshGatekeeper {
  private app: Express;
  private server: Server | null = null;
  private devices: Map<string, DeviceInfo> = new Map();
  private messageQueue: Message[] = [];
  private secretKey: string;
  private allowedDevices: Set<string> = new Set();

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.secretKey = process.env.MESH_SECRET_KEY || crypto.randomBytes(32).toString('hex');
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Device registration
    this.app.post('/mesh/register', async (req: Request, res: Response) => {
      const { name, type, capabilities, publicKey } = req.body;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      const validation = await this.validateRegistration(req);
      if (!validation.valid) {
        return res.status(403).json({ success: false, error: validation.reason });
      }

      const deviceId = this.generateDeviceId(name, ip);
      const device: DeviceInfo = {
        id: deviceId,
        name,
        type: type || 'unknown',
        ip,
        lastSeen: new Date(),
        status: 'pending',
        capabilities: capabilities || [],
        publicKey,
      };

      this.devices.set(deviceId, device);
      console.log(`📱 New device registered: ${name} (${deviceId})`);

      res.json({
        success: true,
        deviceId,
        token: this.generateDeviceToken(deviceId),
      });
    });

    // Device heartbeat
    this.app.post('/mesh/heartbeat', (req: Request, res: Response) => {
      const { deviceId, token } = req.body;

      if (!this.validateToken(deviceId, token)) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
      }

      const device = this.devices.get(deviceId);
      if (device) {
        device.lastSeen = new Date();
        device.status = 'online';
        this.devices.set(deviceId, device);
      }

      res.json({ success: true, timestamp: new Date().toISOString() });
    });

    // Send message to another device
    this.app.post('/mesh/send', (req: Request, res: Response) => {
      const { deviceId, token, to, type, payload } = req.body;

      if (!this.validateToken(deviceId, token)) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
      }

      const validation = this.validateMessage(deviceId, to, type, payload);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.reason });
      }

      const message: Message = {
        id: crypto.randomUUID(),
        from: deviceId,
        to,
        type,
        payload,
        timestamp: new Date(),
        signature: this.signMessage(deviceId, payload),
      };

      this.messageQueue.push(message);
      this.routeMessage(message);

      res.json({ success: true, messageId: message.id });
    });

    // Get pending messages for a device
    this.app.get('/mesh/messages/:deviceId', (req: Request, res: Response) => {
      const { deviceId } = req.params;
      const token = req.headers['x-mesh-token'] as string;

      if (!this.validateToken(deviceId, token)) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
      }

      const messages = this.messageQueue.filter(
        m => m.to === deviceId || m.to === 'broadcast'
      );

      // Remove delivered messages
      this.messageQueue = this.messageQueue.filter(
        m => m.to !== deviceId && m.to !== 'broadcast'
      );

      res.json({ success: true, messages });
    });

    // List all devices
    this.app.get('/mesh/devices', (req: Request, res: Response) => {
      const token = req.headers['x-mesh-token'] as string;
      
      // Only admin can list all devices
      if (token !== this.secretKey) {
        return res.status(403).json({ success: false, error: 'Admin only' });
      }

      const devices = Array.from(this.devices.values()).map(d => ({
        ...d,
        publicKey: undefined, // Don't expose public keys in list
      }));

      res.json({ success: true, devices });
    });

    // Approve/reject pending device
    this.app.post('/mesh/approve', (req: Request, res: Response) => {
      const { deviceId, approve, adminToken } = req.body;

      if (adminToken !== this.secretKey) {
        return res.status(403).json({ success: false, error: 'Admin only' });
      }

      const device = this.devices.get(deviceId);
      if (!device) {
        return res.status(404).json({ success: false, error: 'Device not found' });
      }

      if (approve) {
        device.status = 'online';
        this.allowedDevices.add(deviceId);
        console.log(`✅ Device approved: ${device.name}`);
      } else {
        this.devices.delete(deviceId);
        console.log(`❌ Device rejected: ${device.name}`);
      }

      res.json({ success: true, status: approve ? 'approved' : 'rejected' });
    });

    // Broadcast command to all devices
    this.app.post('/mesh/broadcast', (req: Request, res: Response) => {
      const { adminToken, command, payload } = req.body;

      if (adminToken !== this.secretKey) {
        return res.status(403).json({ success: false, error: 'Admin only' });
      }

      const message: Message = {
        id: crypto.randomUUID(),
        from: 'gatekeeper',
        to: 'broadcast',
        type: 'command',
        payload: { command, ...payload },
        timestamp: new Date(),
        signature: this.signMessage('gatekeeper', payload),
      };

      this.messageQueue.push(message);
      console.log(`📢 Broadcast: ${command}`);

      res.json({ success: true, messageId: message.id });
    });

    // Execute command on specific device
    this.app.post('/mesh/execute', (req: Request, res: Response) => {
      const { adminToken, targetDevice, command, payload } = req.body;

      if (adminToken !== this.secretKey) {
        return res.status(403).json({ success: false, error: 'Admin only' });
      }

      const device = this.devices.get(targetDevice);
      if (!device) {
        return res.status(404).json({ success: false, error: 'Device not found' });
      }

      // Validate command is safe
      const validation = this.validateCommand(command, payload);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.reason });
      }

      const message: Message = {
        id: crypto.randomUUID(),
        from: 'gatekeeper',
        to: targetDevice,
        type: 'command',
        payload: { command, ...payload },
        timestamp: new Date(),
        signature: this.signMessage('gatekeeper', payload),
      };

      this.messageQueue.push(message);
      console.log(`🎯 Command to ${device.name}: ${command}`);

      res.json({ success: true, messageId: message.id });
    });

    // Sync data across devices
    this.app.post('/mesh/sync', (req: Request, res: Response) => {
      const { deviceId, token, dataType, data } = req.body;

      if (!this.validateToken(deviceId, token)) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
      }

      // Broadcast sync to all other devices
      for (const [id, device] of this.devices) {
        if (id !== deviceId && device.status === 'online') {
          const message: Message = {
            id: crypto.randomUUID(),
            from: deviceId,
            to: id,
            type: 'sync',
            payload: { dataType, data },
            timestamp: new Date(),
          };
          this.messageQueue.push(message);
        }
      }

      console.log(`🔄 Sync from ${deviceId}: ${dataType}`);
      res.json({ success: true });
    });

    // Health check
    this.app.get('/mesh/health', (req: Request, res: Response) => {
      const onlineDevices = Array.from(this.devices.values()).filter(d => d.status === 'online').length;
      res.json({
        success: true,
        gatekeeper: 'online',
        devices: {
          total: this.devices.size,
          online: onlineDevices,
          pending: this.devices.size - onlineDevices,
        },
        queuedMessages: this.messageQueue.length,
      });
    });
  }

  /**
   * Validate device registration
   */
  private async validateRegistration(req: Request): Promise<ValidationResult> {
    const { name, registrationKey } = req.body;

    // Check if registration key matches (if required)
    if (process.env.MESH_REGISTRATION_KEY) {
      if (registrationKey !== process.env.MESH_REGISTRATION_KEY) {
        return { valid: false, reason: 'Invalid registration key' };
      }
    }

    // Check for duplicate names
    for (const device of this.devices.values()) {
      if (device.name === name) {
        return { valid: false, reason: 'Device name already registered' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate message
   */
  private validateMessage(from: string, to: string, type: string, payload: any): ValidationResult {
    // Check if sender is approved
    if (!this.allowedDevices.has(from) && from !== 'gatekeeper') {
      return { valid: false, reason: 'Sender not approved' };
    }

    // Check if recipient exists (unless broadcast)
    if (to !== 'broadcast' && !this.devices.has(to)) {
      return { valid: false, reason: 'Recipient not found' };
    }

    // Validate message type
    const validTypes = ['command', 'response', 'sync', 'heartbeat', 'alert'];
    if (!validTypes.includes(type)) {
      return { valid: false, reason: 'Invalid message type' };
    }

    return { valid: true };
  }

  /**
   * Validate command before execution
   */
  private validateCommand(command: string, payload: any): ValidationResult {
    // Blocklist dangerous commands
    const blockedCommands = ['rm -rf', 'format', 'del /f', 'shutdown', 'reboot'];
    
    for (const blocked of blockedCommands) {
      if (command.toLowerCase().includes(blocked)) {
        return { valid: false, reason: `Blocked command: ${blocked}` };
      }
    }

    // Allowed command patterns
    const allowedPatterns = [
      /^sync\s/,
      /^status$/,
      /^backup/,
      /^update/,
      /^notify/,
      /^execute_safe/,
      /^query/,
      /^report/,
    ];

    const isAllowed = allowedPatterns.some(pattern => pattern.test(command));
    if (!isAllowed) {
      return { valid: false, reason: 'Command not in allowlist' };
    }

    return { valid: true };
  }

  /**
   * Generate device ID
   */
  private generateDeviceId(name: string, ip: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${name}-${ip}-${Date.now()}`);
    return hash.digest('hex').slice(0, 16);
  }

  /**
   * Generate device token
   */
  private generateDeviceToken(deviceId: string): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(deviceId);
    return hmac.digest('hex');
  }

  /**
   * Validate device token
   */
  private validateToken(deviceId: string, token: string): boolean {
    const expectedToken = this.generateDeviceToken(deviceId);
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expectedToken);
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(new Uint8Array(tokenBuf), new Uint8Array(expectedBuf));
  }

  /**
   * Sign message
   */
  private signMessage(from: string, payload: any): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(`${from}-${JSON.stringify(payload)}`);
    return hmac.digest('hex');
  }

  /**
   * Route message to recipient
   */
  private routeMessage(message: Message): void {
    // In a full implementation, this would push to connected WebSocket clients
    // For now, messages are queued and polled
    console.log(`📨 Message queued: ${message.from} → ${message.to} (${message.type})`);
  }

  /**
   * Start the gatekeeper server
   */
  start(port: number = 3850): void {
    this.server = this.app.listen(port, () => {
      console.log('\n');
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║     🌐 DEVICE MESH GATEKEEPER STARTED                          ║');
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log(`║  Port: ${port}                                                   ║`);
      console.log(`║  Secret Key: ${this.secretKey.slice(0, 8)}...                           ║`);
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log('║  Endpoints:                                                    ║');
      console.log('║    POST /mesh/register    - Register new device                ║');
      console.log('║    POST /mesh/heartbeat   - Device heartbeat                   ║');
      console.log('║    POST /mesh/send        - Send message to device             ║');
      console.log('║    GET  /mesh/messages/:id - Get pending messages              ║');
      console.log('║    GET  /mesh/devices     - List all devices (admin)           ║');
      console.log('║    POST /mesh/approve     - Approve/reject device (admin)      ║');
      console.log('║    POST /mesh/broadcast   - Broadcast to all (admin)           ║');
      console.log('║    POST /mesh/execute     - Execute command (admin)            ║');
      console.log('║    POST /mesh/sync        - Sync data across devices           ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('\n');
    });

    // Cleanup offline devices periodically
    setInterval(() => {
      const timeout = 5 * 60 * 1000; // 5 minutes
      const now = new Date();

      for (const [id, device] of this.devices) {
        if (device.status === 'online' && now.getTime() - device.lastSeen.getTime() > timeout) {
          device.status = 'offline';
          this.devices.set(id, device);
          console.log(`📴 Device offline: ${device.name}`);
        }
      }
    }, 60000);
  }

  /**
   * Get secret key (for client setup)
   */
  getSecretKey(): string {
    return this.secretKey;
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}

/**
 * Device Mesh Client
 * Install this on each device to connect to the mesh
 */
export class DeviceMeshClient {
  private gatekeeperUrl: string;
  private deviceId: string | null = null;
  private token: string | null = null;
  private name: string;
  private type: DeviceInfo['type'];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(gatekeeperUrl: string, name: string, type: DeviceInfo['type'] = 'unknown') {
    this.gatekeeperUrl = gatekeeperUrl;
    this.name = name;
    this.type = type;
  }

  /**
   * Register with the gatekeeper
   */
  async register(registrationKey?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.gatekeeperUrl}/mesh/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.name,
          type: this.type,
          capabilities: ['execute', 'sync', 'backup'],
          registrationKey,
        }),
      });

      const data = await response.json();
      if (data.success) {
        this.deviceId = data.deviceId;
        this.token = data.token;
        console.log(`✅ Registered with mesh as ${this.name} (${this.deviceId})`);
        this.startHeartbeat();
        return true;
      } else {
        console.error('Registration failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await fetch(`${this.gatekeeperUrl}/mesh/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: this.deviceId, token: this.token }),
        });
      } catch {
        console.warn('Heartbeat failed');
      }
    }, 30000);
  }

  /**
   * Send message to another device
   */
  async sendMessage(to: string, type: Message['type'], payload: any): Promise<boolean> {
    if (!this.deviceId || !this.token) {
      console.error('Not registered');
      return false;
    }

    try {
      const response = await fetch(`${this.gatekeeperUrl}/mesh/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          token: this.token,
          to,
          type,
          payload,
        }),
      });

      const data = await response.json();
      return data.success;
    } catch {
      return false;
    }
  }

  /**
   * Get pending messages
   */
  async getMessages(): Promise<Message[]> {
    if (!this.deviceId || !this.token) return [];

    try {
      const response = await fetch(`${this.gatekeeperUrl}/mesh/messages/${this.deviceId}`, {
        headers: { 'X-Mesh-Token': this.token },
      });

      const data = await response.json();
      return data.success ? data.messages : [];
    } catch {
      return [];
    }
  }

  /**
   * Sync data to all devices
   */
  async sync(dataType: string, data: any): Promise<boolean> {
    if (!this.deviceId || !this.token) return false;

    try {
      const response = await fetch(`${this.gatekeeperUrl}/mesh/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          token: this.token,
          dataType,
          data,
        }),
      });

      const data_1 = await response.json();
      return data_1.success;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect from mesh
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}

