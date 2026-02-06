/**
 * 🏰 CEVICT EMPIRE - Linux Bootstrap Module
 * 
 * This module handles automatic setup when Local Agent first runs on a fresh Linux install.
 * It detects the OS, checks what's missing, and installs everything needed.
 * 
 * Usage:
 *   - Runs automatically on first startup if Linux detected
 *   - Can be triggered manually via API: POST /bootstrap/linux
 *   - Or via CLI: pnpm run bootstrap
 */

import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// ============================================================
// TYPES
// ============================================================

interface BootstrapStep {
  name: string;
  check: () => Promise<boolean>;
  install: () => Promise<void>;
  required: boolean;
}

interface BootstrapResult {
  success: boolean;
  steps: {
    name: string;
    status: 'skipped' | 'installed' | 'failed';
    error?: string;
  }[];
  duration: number;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const log = {
  info: (msg: string) => console.log(`🏰 [Bootstrap] ${msg}`),
  success: (msg: string) => console.log(`✅ [Bootstrap] ${msg}`),
  warning: (msg: string) => console.log(`⚠️  [Bootstrap] ${msg}`),
  error: (msg: string) => console.error(`❌ [Bootstrap] ${msg}`),
  step: (msg: string) => console.log(`▶ ${msg}`),
};

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execAsync(`which ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

async function serviceExists(service: string): Promise<boolean> {
  try {
    await execAsync(`systemctl list-unit-files | grep -q ${service}`);
    return true;
  } catch {
    return false;
  }
}

async function serviceIsActive(service: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`systemctl is-active ${service}`);
    return stdout.trim() === 'active';
  } catch {
    return false;
  }
}

async function runSudo(command: string): Promise<{ stdout: string; stderr: string }> {
  // For non-interactive install, we assume passwordless sudo or run as root
  return execAsync(`sudo ${command}`);
}

function isLinux(): boolean {
  return os.platform() === 'linux';
}

function isWSL(): boolean {
  try {
    const release = fs.readFileSync('/proc/version', 'utf8');
    return release.toLowerCase().includes('microsoft');
  } catch {
    return false;
  }
}

// ============================================================
// BOOTSTRAP STEPS
// ============================================================

const bootstrapSteps: BootstrapStep[] = [
  // System update
  {
    name: 'System packages update',
    check: async () => false, // Always run
    install: async () => {
      log.step('Updating system packages...');
      await runSudo('apt update');
    },
    required: true,
  },

  // Essential tools
  {
    name: 'Essential build tools',
    check: async () => commandExists('gcc') && commandExists('make'),
    install: async () => {
      log.step('Installing build-essential...');
      await runSudo('apt install -y build-essential curl wget git');
    },
    required: true,
  },

  // Node.js
  {
    name: 'Node.js 20',
    check: async () => {
      if (!await commandExists('node')) return false;
      const { stdout } = await execAsync('node -v');
      const version = parseInt(stdout.replace('v', '').split('.')[0]);
      return version >= 20;
    },
    install: async () => {
      log.step('Installing Node.js 20...');
      await execAsync('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
      await runSudo('apt install -y nodejs');
    },
    required: true,
  },

  // pnpm
  {
    name: 'pnpm',
    check: async () => commandExists('pnpm'),
    install: async () => {
      log.step('Installing pnpm...');
      await execAsync('npm install -g pnpm');
    },
    required: true,
  },

  // Python
  {
    name: 'Python 3 + pip',
    check: async () => commandExists('python3') && commandExists('pip3'),
    install: async () => {
      log.step('Installing Python 3...');
      await runSudo('apt install -y python3 python3-pip python3-venv python3-dev');
    },
    required: true,
  },

  // Redis
  {
    name: 'Redis server',
    check: async () => serviceIsActive('redis-server'),
    install: async () => {
      log.step('Installing Redis...');
      await runSudo('apt install -y redis-server');
      await runSudo('systemctl enable redis-server');
      await runSudo('systemctl start redis-server');
    },
    required: true,
  },

  // fzf (for command center menu)
  {
    name: 'fzf (command center)',
    check: async () => commandExists('fzf'),
    install: async () => {
      log.step('Installing fzf...');
      await runSudo('apt install -y fzf');
    },
    required: false,
  },

  // jq (JSON processor)
  {
    name: 'jq (JSON tools)',
    check: async () => commandExists('jq'),
    install: async () => {
      log.step('Installing jq...');
      await runSudo('apt install -y jq');
    },
    required: false,
  },

  // htop
  {
    name: 'htop (system monitor)',
    check: async () => commandExists('htop'),
    install: async () => {
      log.step('Installing htop...');
      await runSudo('apt install -y htop');
    },
    required: false,
  },

  // tmux
  {
    name: 'tmux (terminal multiplexer)',
    check: async () => commandExists('tmux'),
    install: async () => {
      log.step('Installing tmux...');
      await runSudo('apt install -y tmux');
    },
    required: false,
  },
];

// ============================================================
// SHELL ALIASES SETUP
// ============================================================

async function setupShellAliases(): Promise<void> {
  log.step('Setting up Empire shell commands...');

  const bashrcPath = path.join(os.homedir(), '.bashrc');
  const marker = '# 🏰 CEVICT EMPIRE COMMANDS';

  // Check if already added
  if (fs.existsSync(bashrcPath)) {
    const content = fs.readFileSync(bashrcPath, 'utf8');
    if (content.includes(marker)) {
      log.info('Shell commands already configured');
      return;
    }
  }

  const aliases = `

${marker}
# Added by Local Agent bootstrap - ${new Date().toISOString()}

# Quick navigation
alias cevict="cd ~/cevict-monorepo"
alias progno="cd ~/cevict-monorepo/apps/progno"
alias agent="cd ~/cevict-monorepo/apps/local-agent"
alias hunter="cd ~/cevict-monorepo/apps/alpha-hunter"

# Service management
alias agent-logs="journalctl -u local-agent -f --no-pager"
alias agent-restart="sudo systemctl restart local-agent"
alias agent-status="systemctl status local-agent"

# Empire status dashboard
empire-status() {
    echo "🏰 ============================================"
    echo "🏰 CEVICT EMPIRE STATUS"
    echo "🏰 ============================================"
    echo ""
    echo "📡 Local Agent:"
    systemctl is-active local-agent 2>/dev/null && echo "   ✅ Running" || echo "   ❌ Stopped"
    echo ""
    echo "🔴 Redis:"
    systemctl is-active redis-server 2>/dev/null && echo "   ✅ Running" || echo "   ❌ Stopped"
    echo ""
    echo "💾 Disk Usage:"
    df -h / | tail -1 | awk '{print "   " $3 " used / " $2 " total (" $5 " full)"}'
    echo ""
    echo "🧠 Memory:"
    free -h | grep Mem | awk '{print "   " $3 " used / " $2 " total"}'
    echo ""
    if curl -s http://localhost:3847/health > /dev/null 2>&1; then
        echo "🤖 Agent API: ✅ Responding on :3847"
    else
        echo "🤖 Agent API: ❌ Not responding"
    fi
    echo ""
}

# Empire command center (fzf launcher)
e() {
    if ! command -v fzf &> /dev/null; then
        echo "fzf not installed. Run: sudo apt install fzf"
        return 1
    fi
    
    choice=$(cat << 'MENU' | fzf --height=15 --border --header="🏰 EMPIRE COMMAND CENTER"
empire-status     │ System dashboard
agent-logs        │ Watch Local Agent logs
agent-restart     │ Restart Local Agent
cevict            │ Go to monorepo
progno            │ Go to PROGNO app
hunter            │ Go to Alpha Hunter
pnpm dev          │ Start dev server
htop              │ System monitor
MENU
)
    cmd=$(echo "$choice" | awk -F'│' '{print $1}' | xargs)
    [ -n "$cmd" ] && eval "$cmd"
}

# Quick health check
health() {
    curl -s http://localhost:3847/health | jq . 2>/dev/null || echo "Agent not responding"
}
# END CEVICT EMPIRE COMMANDS
`;

  fs.appendFileSync(bashrcPath, aliases);
  log.success('Shell commands added to ~/.bashrc');
}

// ============================================================
// SYSTEMD SERVICE SETUP
// ============================================================

async function setupSystemdService(): Promise<void> {
  log.step('Setting up Local Agent systemd service...');

  const homeDir = os.homedir();
  const user = os.userInfo().username;
  const repoDir = path.join(homeDir, 'cevict-monorepo');

  const serviceContent = `[Unit]
Description=Cevict Local Agent - Autonomous AI Helper
After=network.target redis-server.service
Wants=redis-server.service

[Service]
Type=simple
User=${user}
WorkingDirectory=${repoDir}/apps/local-agent
ExecStart=/usr/bin/pnpm run start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=HOME=${homeDir}

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=local-agent

[Install]
WantedBy=multi-user.target
`;

  const servicePath = '/etc/systemd/system/local-agent.service';

  // Write service file
  await runSudo(`bash -c 'cat > ${servicePath} << EOFSERVICE
${serviceContent}
EOFSERVICE'`);

  await runSudo('systemctl daemon-reload');
  log.success('Systemd service created');
}

// ============================================================
// DIRECTORY STRUCTURE
// ============================================================

async function setupDirectories(): Promise<void> {
  log.step('Creating empire directory structure...');

  const dirs = [
    path.join(os.homedir(), 'empire', 'logs'),
    path.join(os.homedir(), 'empire', 'backups'),
    path.join(os.homedir(), 'empire', 'scripts'),
    path.join(os.homedir(), 'cevict-monorepo'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.info(`Created: ${dir}`);
    }
  }
}

// ============================================================
// MAIN BOOTSTRAP FUNCTION
// ============================================================

export async function runBootstrap(): Promise<BootstrapResult> {
  const startTime = Date.now();
  const results: BootstrapResult = {
    success: true,
    steps: [],
    duration: 0,
  };

  log.info('============================================');
  log.info('🏰 CEVICT EMPIRE - LINUX BOOTSTRAP');
  log.info('============================================');

  // Check if we're on Linux
  if (!isLinux()) {
    log.warning('Not running on Linux. Bootstrap skipped.');
    log.info('This bootstrap is designed for Linux/Pop!_OS systems.');
    return {
      success: false,
      steps: [{ name: 'OS Check', status: 'failed', error: 'Not Linux' }],
      duration: Date.now() - startTime,
    };
  }

  if (isWSL()) {
    log.info('Detected WSL environment');
  }

  // Run each bootstrap step
  for (const step of bootstrapSteps) {
    try {
      const alreadyInstalled = await step.check();

      if (alreadyInstalled) {
        log.info(`${step.name}: Already installed ✓`);
        results.steps.push({ name: step.name, status: 'skipped' });
      } else {
        log.step(`Installing: ${step.name}...`);
        await step.install();
        log.success(`${step.name}: Installed ✓`);
        results.steps.push({ name: step.name, status: 'installed' });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`${step.name}: Failed - ${errorMsg}`);
      results.steps.push({ name: step.name, status: 'failed', error: errorMsg });

      if (step.required) {
        results.success = false;
        log.error('Required step failed. Bootstrap incomplete.');
        break;
      }
    }
  }

  // Setup additional components
  if (results.success) {
    try {
      await setupDirectories();
      await setupShellAliases();
      await setupSystemdService();
    } catch (error) {
      log.error(`Additional setup failed: ${error}`);
    }
  }

  results.duration = Date.now() - startTime;

  // Summary
  log.info('============================================');
  log.info('BOOTSTRAP SUMMARY');
  log.info('============================================');
  log.info(`Duration: ${(results.duration / 1000).toFixed(1)}s`);
  log.info(`Steps: ${results.steps.length}`);
  log.info(`Installed: ${results.steps.filter(s => s.status === 'installed').length}`);
  log.info(`Skipped: ${results.steps.filter(s => s.status === 'skipped').length}`);
  log.info(`Failed: ${results.steps.filter(s => s.status === 'failed').length}`);

  if (results.success) {
    log.success('============================================');
    log.success('🏰 BOOTSTRAP COMPLETE!');
    log.success('============================================');
    log.info('');
    log.info('Next steps:');
    log.info('  1. Run: source ~/.bashrc');
    log.info('  2. Run: pnpm install (in monorepo)');
    log.info('  3. Run: sudo systemctl enable local-agent');
    log.info('  4. Run: sudo systemctl start local-agent');
    log.info('  5. Try: e (command center)');
    log.info('');
  }

  return results;
}

// ============================================================
// AUTO-DETECT & RUN ON IMPORT (if needed)
// ============================================================

export async function checkAndBootstrapIfNeeded(): Promise<void> {
  if (!isLinux()) return;

  const bootstrapMarker = path.join(os.homedir(), '.cevict-bootstrap-complete');

  if (fs.existsSync(bootstrapMarker)) {
    log.info('Bootstrap already completed previously');
    return;
  }

  log.info('First run on Linux detected - running bootstrap...');
  const result = await runBootstrap();

  if (result.success) {
    fs.writeFileSync(bootstrapMarker, new Date().toISOString());
    log.success('Bootstrap marker created');
  }
}

// ============================================================
// CLI ENTRY POINT
// ============================================================

if (require.main === module) {
  runBootstrap()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Bootstrap failed:', error);
      process.exit(1);
    });
}

