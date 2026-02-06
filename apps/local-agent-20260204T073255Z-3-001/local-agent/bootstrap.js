#!/usr/bin/env node
/**
 * 🏰 CEVICT EMPIRE - Quick Bootstrap Launcher
 * 
 * This is a simple Node.js script that can run before TypeScript is compiled.
 * For fresh Linux installs where you might not have ts-node yet.
 * 
 * Usage:
 *   node bootstrap.js          # Run bootstrap
 *   node bootstrap.js --check  # Check status only
 */

const { execSync, exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const isLinux = os.platform() === 'linux';

console.log('🏰 ============================================');
console.log('🏰 CEVICT EMPIRE - QUICK BOOTSTRAP');
console.log('🏰 ============================================');
console.log('');

if (!isLinux) {
  console.log('⚠️  Not running on Linux.');
  console.log('   This bootstrap is for Linux/Pop!_OS systems.');
  console.log('');
  console.log('   For Windows, use the full dev environment.');
  process.exit(0);
}

// Check if --check flag passed
if (process.argv.includes('--check')) {
  console.log('📋 Checking installed components...');
  console.log('');
  
  const checks = [
    { name: 'Node.js', cmd: 'node -v' },
    { name: 'pnpm', cmd: 'pnpm -v' },
    { name: 'Python 3', cmd: 'python3 --version' },
    { name: 'Redis', cmd: 'systemctl is-active redis-server' },
    { name: 'fzf', cmd: 'which fzf' },
    { name: 'git', cmd: 'git --version' },
  ];

  for (const check of checks) {
    try {
      const result = execSync(check.cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      console.log(`✅ ${check.name}: ${result}`);
    } catch {
      console.log(`❌ ${check.name}: Not found`);
    }
  }
  
  console.log('');
  process.exit(0);
}

// Run the shell script if it exists
const scriptPath = path.join(__dirname, '..', '..', '..', 'scripts', 'linux-empire-setup.sh');

if (fs.existsSync(scriptPath)) {
  console.log('📜 Found setup script, running...');
  console.log(`   ${scriptPath}`);
  console.log('');
  
  try {
    execSync(`chmod +x "${scriptPath}" && "${scriptPath}"`, { 
      stdio: 'inherit',
      shell: '/bin/bash'
    });
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
} else {
  // Inline minimal bootstrap
  console.log('📦 Running inline bootstrap...');
  console.log('');

  const commands = [
    { name: 'Update apt', cmd: 'sudo apt update' },
    { name: 'Install essentials', cmd: 'sudo apt install -y git curl wget build-essential fzf jq htop' },
    { name: 'Install Node.js 20', cmd: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs', skip: () => {
      try { 
        const v = execSync('node -v', { encoding: 'utf8' });
        return parseInt(v.replace('v','')) >= 20;
      } catch { return false; }
    }},
    { name: 'Install pnpm', cmd: 'npm install -g pnpm', skip: () => {
      try { execSync('which pnpm'); return true; } catch { return false; }
    }},
    { name: 'Install Python', cmd: 'sudo apt install -y python3 python3-pip python3-venv' },
    { name: 'Install Redis', cmd: 'sudo apt install -y redis-server && sudo systemctl enable redis-server && sudo systemctl start redis-server' },
  ];

  for (const step of commands) {
    if (step.skip && step.skip()) {
      console.log(`⏭️  ${step.name}: Already installed, skipping`);
      continue;
    }
    
    console.log(`▶ ${step.name}...`);
    try {
      execSync(step.cmd, { stdio: 'inherit', shell: '/bin/bash' });
      console.log(`✅ ${step.name}: Done`);
    } catch (error) {
      console.error(`❌ ${step.name}: Failed`);
      console.error(`   Command: ${step.cmd}`);
    }
    console.log('');
  }

  // Setup aliases
  console.log('▶ Setting up shell aliases...');
  const bashrc = path.join(os.homedir(), '.bashrc');
  const marker = '# 🏰 CEVICT EMPIRE COMMANDS';
  
  const existing = fs.existsSync(bashrc) ? fs.readFileSync(bashrc, 'utf8') : '';
  
  if (!existing.includes(marker)) {
    const aliases = `
${marker}
alias cevict="cd ~/cevict-monorepo"
alias agent-logs="journalctl -u local-agent -f"
alias agent-restart="sudo systemctl restart local-agent"
empire-status() { systemctl status local-agent redis-server; curl -s http://localhost:3847/health | jq .; }
e() { choice=$(echo -e "empire-status\\nagent-logs\\nagent-restart\\ncevict" | fzf --height=10); eval "$choice"; }
`;
    fs.appendFileSync(bashrc, aliases);
    console.log('✅ Aliases added to ~/.bashrc');
  } else {
    console.log('⏭️  Aliases already exist');
  }
}

console.log('');
console.log('🏰 ============================================');
console.log('🏰 BOOTSTRAP COMPLETE!');
console.log('🏰 ============================================');
console.log('');
console.log('Next steps:');
console.log('  1. source ~/.bashrc');
console.log('  2. cd ~/cevict-monorepo && pnpm install');
console.log('  3. sudo systemctl enable local-agent');
console.log('  4. sudo systemctl start local-agent');
console.log('  5. e  (command center)');
console.log('');

