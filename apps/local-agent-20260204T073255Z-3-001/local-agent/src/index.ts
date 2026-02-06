/**
 * LOCAL AGENT - Claude's Autonomous Helper
 * 
 * This agent runs on your machine and can:
 * - Execute terminal commands
 * - Edit files
 * - Monitor system health
 * - Run scheduled tasks
 * - Communicate with Claude via API
 * - Pull tasks from a queue and execute them
 * 
 * YOU ARE NOW OUT OF THE LOOP! 🚀
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { CommandExecutor } from './executor.js';
import { FileManager } from './file-manager.js';
import { TaskQueue } from './task-queue.js';
import { SystemMonitor } from './system-monitor.js';
import { ClaudeComms } from './claude-comms.js';
import { Scheduler } from './scheduler.js';
import { SubscriptionMonitor } from './subscription-monitor.js';
import { BackupManager } from './backup-manager.js';
import { BotOrchestrator } from './specialist-bots/orchestrator.js';
import { BluetoothScanner } from './bluetooth-scanner.js';
import { ScorchedEarthBackup } from './scorched-earth-backup.js';
import { WiFiScanner } from './wifi-scanner.js';
import { DeviceMeshGatekeeper } from './device-mesh.js';
import alphaHunterRoutes from './routes/alpha-hunter.js';
import guiRoutes from './routes/gui.js';
import autonomousRoutes from './routes/autonomous.js';
import cursorRoutes from './routes/cursor.js';
import cursorSettingsRoutes from './routes/cursor-settings.js';
import uiAutomationRoutes from './routes/ui-automation.js';
import cursorAcceptRoutes from './routes/cursor-accept.js';
import intentRoutes from './routes/intent.js';
import clickWatcherRoutes from './routes/click-watcher.js';
import { aiAssistantMonitor } from './ai-assistant-monitor.js';

const PORT = parseInt(process.env.AGENT_PORT || '3847');
const WORKSPACE = process.env.WORKSPACE_PATH || 'C:\\gcc\\cevict-app\\cevict-monorepo';

class LocalAgent {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private executor: CommandExecutor;
  private fileManager: FileManager;
  private taskQueue: TaskQueue;
  private monitor: SystemMonitor;
  private claude: ClaudeComms;
  private scheduler: Scheduler;
  private subscriptions: SubscriptionMonitor;
  private backup: BackupManager;
  private bots: BotOrchestrator;
  private bluetooth: BluetoothScanner;
  private wifi: WiFiScanner;
  private mesh: DeviceMeshGatekeeper;
  private isRunning: boolean = false;

  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));

    this.executor = new CommandExecutor(WORKSPACE);
    this.fileManager = new FileManager(WORKSPACE);
    this.taskQueue = new TaskQueue();
    this.monitor = new SystemMonitor();
    this.claude = new ClaudeComms();
    this.scheduler = new Scheduler(this);
    this.subscriptions = new SubscriptionMonitor();
    this.backup = new BackupManager(WORKSPACE);
    this.bots = new BotOrchestrator();
    this.bluetooth = new BluetoothScanner();
    this.wifi = new WiFiScanner();
    this.mesh = new DeviceMeshGatekeeper();

    this.setupRoutes();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'running',
        uptime: process.uptime(),
        workspace: WORKSPACE,
        tasksInQueue: this.taskQueue.size(),
      });
    });

    // AI Assistant Monitor endpoints
    this.app.get('/ai-assistant/status', (req, res) => {
      res.json(aiAssistantMonitor.getStatus());
    });

    this.app.get('/ai-assistant/patterns', (req, res) => {
      res.json({
        patterns: aiAssistantMonitor.getStuckPatterns(),
        count: aiAssistantMonitor.getStuckPatterns().length,
      });
    });

    this.app.post('/ai-assistant/restart', async (req, res) => {
      const { reason } = req.body;
      const sessionId = await aiAssistantMonitor.restartSession(reason || 'Manual restart');
      res.json({
        success: true,
        sessionId,
        message: 'AI Assistant session restarted',
      });
    });

    this.app.post('/ai-assistant/start-session', (req, res) => {
      const { sessionId } = req.body;
      aiAssistantMonitor.startSession(sessionId || `session_${Date.now()}`);
      res.json({
        success: true,
        sessionId: aiAssistantMonitor.getStatus().sessionId,
      });
    });

    this.app.post('/ai-assistant/end-session', (req, res) => {
      aiAssistantMonitor.endSession();
      res.json({ success: true, message: 'Session ended' });
    });

    this.app.post('/ai-assistant/reset', (req, res) => {
      aiAssistantMonitor.reset();
      res.json({ success: true, message: 'Monitor reset' });
    });

    // Execute command
    this.app.post('/execute', async (req, res) => {
      const { command, cwd } = req.body;
      const startTime = Date.now();
      
      try {
        const defaultCwd = cwd || WORKSPACE; // Default to monorepo root
        const result = await this.executor.run(command, defaultCwd);
        const duration = Date.now() - startTime;
        
        // Record successful action
        aiAssistantMonitor.recordAction({
          action: 'execute_command',
          command: command?.substring(0, 100),
          duration,
          success: true,
          context: `cwd: ${defaultCwd}`,
        });
        
        res.json({ 
          success: true, 
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          error: result.error || '',
          ...result 
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        // Record failed action
        aiAssistantMonitor.recordAction({
          action: 'execute_command',
          command: command?.substring(0, 100),
          error: error.message?.substring(0, 200),
          duration,
          success: false,
          context: `cwd: ${cwd || WORKSPACE}`,
        });
        
        res.json({ 
          success: false, 
          stdout: '',
          stderr: '',
          error: error.message 
        });
      }
    });

    // Read file
    this.app.post('/file/read', async (req, res) => {
      const { path } = req.body;
      const startTime = Date.now();
      
      try {
        const content = await this.fileManager.read(path);
        const duration = Date.now() - startTime;
        
        // Record successful action
        aiAssistantMonitor.recordAction({
          action: 'read_file',
          duration,
          success: true,
          context: `file: ${path}`,
        });
        
        res.json({ success: true, content });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        // Record failed action
        aiAssistantMonitor.recordAction({
          action: 'read_file',
          error: error.message?.substring(0, 200),
          duration,
          success: false,
          context: `file: ${path}`,
        });
        
        res.json({ success: false, error: error.message });
      }
    });

    // Write file
    this.app.post('/file/write', async (req, res) => {
      const { path, content } = req.body;
      try {
        await this.fileManager.write(path, content);
        res.json({ success: true });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Search files
    this.app.post('/file/search', async (req, res) => {
      const { pattern, path } = req.body;
      try {
        const results = await this.fileManager.search(pattern, path);
        res.json({ success: true, results });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // List directory
    this.app.post('/file/list', async (req, res) => {
      const { path } = req.body;
      try {
        const files = await this.fileManager.list(path);
        // Transform to format expected by GUI
        const formattedFiles = files.map(f => ({
          name: f.name,
          type: f.type,
          path: f.path,
        }));
        res.json({ success: true, files: formattedFiles });
      } catch (error: any) {
        res.json({ success: false, error: error.message, files: [] });
      }
    });

    // Add task to queue
    this.app.post('/task/add', async (req, res) => {
      const { task, priority } = req.body;
      const id = this.taskQueue.add(task, priority);
      res.json({ success: true, taskId: id });
    });

    // Get task status
    this.app.get('/task/:id', (req, res) => {
      const task = this.taskQueue.get(req.params.id);
      res.json({ success: !!task, task });
    });

    // Get all tasks
    this.app.get('/tasks', (req, res) => {
      const tasks = this.taskQueue.getAll();
      res.json({ success: true, tasks });
    });

    // System info
    this.app.get('/system', async (req, res) => {
      const info = await this.monitor.getInfo();
      res.json({ success: true, ...info });
    });

    // Subscription/token status
    this.app.get('/subscriptions', async (req, res) => {
      const status = await this.subscriptions.checkAll();
      res.json({ success: true, ...this.subscriptions.toJSON() });
    });

    // Get cached subscription status (faster)
    this.app.get('/subscriptions/cached', (req, res) => {
      res.json({ success: true, ...this.subscriptions.toJSON() });
    });

    // Get critical alerts only
    this.app.get('/subscriptions/alerts', (req, res) => {
      const critical = this.subscriptions.getCriticalAlerts();
      const warnings = this.subscriptions.getWarnings();
      res.json({ 
        success: true, 
        hasCritical: critical.length > 0,
        critical,
        warnings,
        alertMessage: this.subscriptions.generateAlertMessage(),
      });
    });

    // Check specific service
    this.app.get('/subscriptions/:service', (req, res) => {
      const status = this.subscriptions.getStatus(req.params.service);
      if (status) {
        res.json({ success: true, status });
      } else {
        res.json({ success: false, error: 'Service not found' });
      }
    });

    // === BACKUP ENDPOINTS ===
    
    // Full backup to local drive
    this.app.post('/backup/local', async (req, res) => {
      try {
        const result = await this.backup.backupToLocal();
        res.json(result);
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Sync to Google Drive
    this.app.post('/backup/google', async (req, res) => {
      try {
        const result = await this.backup.syncToGoogleDrive();
        res.json(result);
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Full migration preparation
    this.app.post('/backup/migrate', async (req, res) => {
      try {
        const result = await this.backup.fullMigration();
        res.json({ success: true, ...result });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Generate Linux migration script
    this.app.post('/backup/linux-script', async (req, res) => {
      try {
        const scriptPath = await this.backup.generateLinuxMigrationScript();
        res.json({ success: true, scriptPath });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // === SPECIALIST BOT ENDPOINTS ===

    // List all bots
    this.app.get('/bots', (req, res) => {
      res.json({ 
        success: true, 
        bots: this.bots.listBots(),
        status: this.bots.getStatus(),
      });
    });

    // Ask a specific bot
    this.app.post('/bots/:name/ask', async (req, res) => {
      const { question, context } = req.body;
      try {
        const response = await this.bots.askBot(req.params.name, question);
        res.json({ success: true, bot: req.params.name, response });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Ask all bots (multi-perspective)
    this.app.post('/bots/ask-all', async (req, res) => {
      const { question } = req.body;
      try {
        const responses = await this.bots.askAllBots(question);
        res.json({ success: true, responses });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Route question to best bot
    this.app.post('/bots/route', async (req, res) => {
      const { question } = req.body;
      try {
        const response = await this.bots.routeQuestion(question);
        res.json({ success: true, ...response });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Run daily learning for all bots
    this.app.post('/bots/learn', async (req, res) => {
      try {
        await this.bots.dailyLearning();
        res.json({ success: true, message: 'Daily learning complete' });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Run daily tasks for all bots
    this.app.post('/bots/tasks', async (req, res) => {
      try {
        const results = await this.bots.runDailyTasks();
        res.json({ success: true, results: Object.fromEntries(results) });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Generate comprehensive report
    this.app.post('/bots/report', async (req, res) => {
      const { topic } = req.body;
      try {
        const report = await this.bots.generateComprehensiveReport(topic);
        res.json({ success: true, report });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // === BOT ACADEMY ENDPOINTS ===

    // Run academy challenge for ALL bots (weekly)
    this.app.post('/academy/run', async (req, res) => {
      try {
        const summary = await this.bots.runFullAcademyDay();
        
        // Send SMS notification
        await this.sendAcademySMS(summary);
        
        res.json({ success: true, summary });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Run academy challenge for ONE bot
    this.app.post('/academy/:botName/challenge', async (req, res) => {
      try {
        const result = await this.bots.runAcademyChallenge(req.params.botName);
        if (result) {
          res.json({ success: true, ...result });
        } else {
          res.json({ success: false, error: 'Bot not found' });
        }
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Get academy stats for a bot
    this.app.get('/academy/:botName/stats', async (req, res) => {
      try {
        const stats = await this.bots.getAcademyStats(req.params.botName);
        res.json({ success: true, stats });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Get academy leaderboard
    this.app.get('/academy/leaderboard', async (req, res) => {
      try {
        const leaderboard = await this.bots.getAcademyLeaderboard();
        res.json({ success: true, leaderboard });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // === BLUETOOTH ENDPOINTS ===

    // Scan for Bluetooth devices
    this.app.get('/bluetooth/scan', async (req, res) => {
      try {
        const result = await this.bluetooth.scan();
        res.json(result);
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Get Bluetooth adapter status
    this.app.get('/bluetooth/status', async (req, res) => {
      try {
        const status = await this.bluetooth.getAdapterStatus();
        res.json({ success: true, ...status });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Enable Bluetooth (may require admin)
    this.app.post('/bluetooth/enable', async (req, res) => {
      try {
        const result = await this.bluetooth.enableBluetooth();
        res.json(result);
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // === SCORCHED EARTH BACKUP ===
    
    // Full backup before nuking - ONE SHOT DEAL
    this.app.post('/backup/scorched-earth', async (req, res) => {
      console.log('\n🔥 SCORCHED EARTH BACKUP INITIATED 🔥\n');
      try {
        const backupPath = req.body?.path;
        const backup = new ScorchedEarthBackup(backupPath);
        const manifest = await backup.execute();
        res.json({ success: true, manifest });
      } catch (error: any) {
        console.error('Backup failed:', error);
        res.json({ success: false, error: error.message });
      }
    });

    // === WIFI SCANNER ENDPOINTS ===

    // Scan for WiFi networks
    this.app.get('/wifi/scan', async (req, res) => {
      try {
        const result = await this.wifi.scan();
        res.json(result);
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Analyze WiFi security threats
    this.app.get('/wifi/security', async (req, res) => {
      try {
        const analysis = await this.wifi.analyzeSecurityThreats();
        res.json({ success: true, ...analysis });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Analyze channel congestion
    this.app.get('/wifi/channels', async (req, res) => {
      try {
        const analysis = await this.wifi.analyzeChannels();
        res.json({ success: true, channels: analysis });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Find best WiFi channel
    this.app.get('/wifi/best-channel', async (req, res) => {
      const band = (req.query.band as '2.4GHz' | '5GHz') || '2.4GHz';
      try {
        const result = await this.wifi.findBestChannel(band);
        res.json({ success: true, ...result });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // === DEVICE MESH ENDPOINTS ===
    // Note: The mesh gatekeeper runs on its own port (3850)
    // These endpoints control the gatekeeper from the main agent

    // Start device mesh gatekeeper
    this.app.post('/mesh/start', (req, res) => {
      try {
        const port = req.body?.port || 3850;
        this.mesh.start(port);
        res.json({ 
          success: true, 
          port,
          secretKey: this.mesh.getSecretKey(),
          message: 'Mesh gatekeeper started. Devices can now register.' 
        });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Get mesh gatekeeper secret key
    this.app.get('/mesh/key', (req, res) => {
      res.json({ 
        success: true, 
        secretKey: this.mesh.getSecretKey(),
      });
    });

    // Ask Claude to do something
    this.app.post('/claude/ask', async (req, res) => {
      const { prompt, context, question } = req.body;
      const query = prompt || question;
      try {
        const response = await this.claude.ask(query, context);
        res.json({ success: true, response });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Execute command via GUI with AI understanding (GENIUS MODE)
    this.app.post('/claude/execute-gui', async (req, res) => {
      try {
        const { instruction } = req.body;
        if (!instruction) {
          return res.json({ success: false, error: 'Instruction required' });
        }
        
        const result = await this.claude.executeViaGUI(instruction);
        res.json(result);
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Execute a full task autonomously (legacy)
    this.app.post('/autonomous', async (req, res) => {
      const { task } = req.body;
      try {
        const result = await this.executeAutonomously(task);
        res.json({ success: true, result });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Autonomous Orchestrator routes (new)
    this.app.use('/autonomous', autonomousRoutes);

    // Git operations
    this.app.post('/git/commit', async (req, res) => {
      const { message } = req.body;
      try {
        await this.executor.run('git add -A');
        const result = await this.executor.run(`git commit -m "${message}"`);
        res.json({ success: true, ...result });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    this.app.post('/git/push', async (req, res) => {
      try {
        const result = await this.executor.run('git push origin main');
        res.json({ success: true, ...result });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Run Alpha Hunter
    this.app.post('/alpha-hunter/run', async (req, res) => {
      try {
        const result = await this.executor.run('pnpm run daily', 'apps/alpha-hunter');
        res.json({ success: true, ...result });
      } catch (error: any) {
        res.json({ success: false, error: error.message });
      }
    });

    // Alpha Hunter API routes
    this.app.use('/alpha-hunter', alphaHunterRoutes);

    // GUI Controller routes
    this.app.use('/gui', guiRoutes);

    // Autonomous Orchestrator routes
    this.app.use('/autonomous', autonomousRoutes);

    // Cursor IDE Integration routes
    this.app.use('/cursor', cursorRoutes);

    // Cursor IDE Settings routes
    this.app.use('/cursor-settings', cursorSettingsRoutes);

    // UI Automation routes (AI Braille)
    this.app.use('/ui-automation', uiAutomationRoutes);

    // Cursor Accept Button Auto-Click
    this.app.use('/cursor-accept', cursorAcceptRoutes);

    // Intent Language (Revolutionary Human-to-AI Communication)
    this.app.use('/intent', intentRoutes);

    // Click Watcher (Learn from user clicks)
    this.app.use('/click-watcher', clickWatcherRoutes);
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      console.log('🔌 Client connected');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          const response = await this.handleWsMessage(message);
          ws.send(JSON.stringify(response));
        } catch (error: any) {
          ws.send(JSON.stringify({ error: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected');
      });
    });
  }

  private async handleWsMessage(message: any): Promise<any> {
    switch (message.type) {
      case 'execute':
        return this.executor.run(message.command, message.cwd);
      case 'read':
        return { content: await this.fileManager.read(message.path) };
      case 'write':
        await this.fileManager.write(message.path, message.content);
        return { success: true };
      case 'task':
        return this.executeAutonomously(message.task);
      default:
        return { error: 'Unknown message type' };
    }
  }

  async executeAutonomously(task: string): Promise<any> {
    console.log(`\n🤖 Autonomous Task: ${task}\n`);

    // Ask Claude how to accomplish the task
    const plan = await this.claude.planTask(task, WORKSPACE);
    console.log('📋 Plan:', plan);

    const results: any[] = [];

    for (const step of plan.steps) {
      console.log(`\n⚡ Executing: ${step.description}`);

      try {
        let result;
        switch (step.type) {
          case 'command':
            result = await this.executor.run(step.command || '', step.cwd);
            break;
          case 'read':
            result = await this.fileManager.read(step.path || '');
            break;
          case 'write':
            await this.fileManager.write(step.path || '', step.content || '');
            result = { success: true };
            break;
          case 'search':
            result = await this.fileManager.search(step.pattern || '', step.path);
            break;
          default:
            result = { error: 'Unknown step type' };
        }
        results.push({ step: step.description, success: true, result });
      } catch (error: any) {
        results.push({ step: step.description, success: false, error: error.message });
        if (step.critical) break;
      }
    }

    return { task, plan: plan.steps.map((s: any) => s.description), results };
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(PORT, () => {
        this.isRunning = true;
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ██╗      ██████╗  ██████╗ █████╗ ██╗                     ║
║     ██║     ██╔═══██╗██╔════╝██╔══██╗██║                     ║
║     ██║     ██║   ██║██║     ███████║██║                     ║
║     ██║     ██║   ██║██║     ██╔══██║██║                     ║
║     ███████╗╚██████╔╝╚██████╗██║  ██║███████╗                ║
║     ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝                ║
║                                                              ║
║      █████╗  ██████╗ ███████╗███╗   ██╗████████╗             ║
║     ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝             ║
║     ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║                ║
║     ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║                ║
║     ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║                ║
║     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝                ║
║                                                              ║
║          🤖 Claude's Autonomous Helper v1.0 🤖               ║
║                                                              ║
║     Port: ${PORT.toString().padEnd(5)}  |  Workspace: ${WORKSPACE.slice(0, 25)}...    ║
║                                                              ║
║     YOU ARE NOW OUT OF THE LOOP! 🚀                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        console.log('📡 API Endpoints:');
        console.log(`   POST http://localhost:${PORT}/execute`);
        console.log(`   POST http://localhost:${PORT}/file/read`);
        console.log(`   POST http://localhost:${PORT}/file/write`);
        console.log(`   POST http://localhost:${PORT}/autonomous`);
        console.log(`   POST http://localhost:${PORT}/claude/ask`);
        console.log(`   GET  http://localhost:${PORT}/health`);
        console.log(`   GET  http://localhost:${PORT}/ai-assistant/status`);
        console.log(`   GET  http://localhost:${PORT}/ai-assistant/patterns`);
        console.log(`   POST http://localhost:${PORT}/ai-assistant/restart`);
        console.log(`   WS   ws://localhost:${PORT}`);
        console.log('\n🤖 AI Assistant Monitor: ACTIVE');
        console.log('   • Detects loops, stuck states, error patterns');
        console.log('   • Auto-restarts AI sessions on critical issues\n');
        
        // Start initial AI session
        aiAssistantMonitor.startSession(`initial_${Date.now()}`);
        console.log('');

        // Start scheduler
        this.scheduler.start();

        // Start subscription monitoring
        this.subscriptions.startMonitoring();

        // Schedule weekly academy (Sundays at 10 AM)
        this.scheduleAcademy();

        resolve();
      });
    });
  }

  /**
   * Schedule weekly bot academy
   */
  private scheduleAcademy(): void {
    // Run every Sunday at 10 AM
    const checkAcademy = () => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 10 && now.getMinutes() === 0) {
        this.runAcademyAndNotify();
      }
    };

    // Check every minute
    setInterval(checkAcademy, 60000);
    console.log('🎓 Bot Academy scheduled for Sundays at 10 AM');
  }

  /**
   * Run academy and send SMS summary
   */
  private async runAcademyAndNotify(): Promise<void> {
    try {
      console.log('\n🎓 WEEKLY BOT ACADEMY STARTING...\n');
      const summary = await this.bots.runFullAcademyDay();
      await this.sendAcademySMS(summary);
    } catch (error) {
      console.error('Academy run failed:', error);
    }
  }

  /**
   * Send academy summary via SMS
   */
  private async sendAcademySMS(summary: string): Promise<void> {
    const sinchKeyId = process.env.SINCH_KEY_ID;
    const sinchKeySecret = process.env.SINCH_KEY_SECRET;
    const sinchProjectId = process.env.SINCH_PROJECT_ID;
    const sinchNumber = process.env.SINCH_NUMBER;
    const myNumber = process.env.MY_PERSONAL_NUMBER;

    if (!sinchKeyId || !sinchKeySecret || !sinchProjectId || !sinchNumber || !myNumber) {
      console.log('📱 SMS not configured - Academy summary:');
      console.log(summary);
      return;
    }

    try {
      const auth = Buffer.from(`${sinchKeyId}:${sinchKeySecret}`).toString('base64');
      
      const response = await fetch(
        `https://sms.api.sinch.com/xms/v1/${sinchProjectId}/batches`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`,
          },
          body: JSON.stringify({
            from: sinchNumber,
            to: [myNumber],
            body: summary.slice(0, 1600), // SMS limit
          }),
        }
      );

      if (response.ok) {
        console.log('📱 Academy summary SMS sent!');
      } else {
        console.error('SMS failed:', await response.text());
      }
    } catch (error) {
      console.error('SMS error:', error);
    }
  }
}

// Start the agent
const agent = new LocalAgent();
agent.start().catch(console.error);

export { LocalAgent };

