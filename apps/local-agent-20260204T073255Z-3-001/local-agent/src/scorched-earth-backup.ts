/**
 * SCORCHED EARTH BACKUP
 * Saves EVERYTHING before nuking the laptop
 * This is a ONE SHOT DEAL - captures all credentials, configs, and data
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface BackupManifest {
  timestamp: string;
  hostname: string;
  user: string;
  sections: {
    name: string;
    status: 'success' | 'failed' | 'manual_required';
    path?: string;
    notes?: string;
  }[];
  manualSteps: string[];
  criticalWarnings: string[];
}

export class ScorchedEarthBackup {
  private backupRoot: string;
  private manifest: BackupManifest;
  private homeDir: string;
  private username: string;

  constructor(backupPath?: string) {
    this.homeDir = os.homedir();
    this.username = os.userInfo().username;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupRoot = backupPath || path.join('D:\\', 'SCORCHED_EARTH_BACKUP', timestamp);
    
    this.manifest = {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      user: this.username,
      sections: [],
      manualSteps: [],
      criticalWarnings: [],
    };
  }

  /**
   * RUN THE FULL BACKUP - ONE SHOT DEAL
   */
  async execute(): Promise<BackupManifest> {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     🔥 SCORCHED EARTH BACKUP - ONE SHOT DEAL 🔥                ║');
    console.log('║                                                                ║');
    console.log('║  Saving EVERYTHING before laptop nuke                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Create backup directory
    await fs.mkdir(this.backupRoot, { recursive: true });
    console.log(`📁 Backup location: ${this.backupRoot}\n`);

    // Execute all backup sections
    await this.backupBrowserData();
    await this.backupIDEConfigs();
    await this.backupSSHKeys();
    await this.backupGitConfig();
    await this.backupCredentials();
    await this.backupEnvironmentVariables();
    await this.backupWiFiPasswords();
    await this.backupProjects();
    await this.backupWindowsSettings();
    await this.backupAppData();
    await this.backupLicenseKeys();
    await this.backupFonts();
    await this.backupDocuments();
    await this.generateRestoreScript();
    await this.generateManualChecklist();
    await this.saveManifest();

    // Final summary
    this.printSummary();

    return this.manifest;
  }

  /**
   * BROWSER DATA - Passwords, Bookmarks, Extensions
   */
  private async backupBrowserData(): Promise<void> {
    console.log('🌐 Backing up browser data...\n');
    const browserDir = path.join(this.backupRoot, 'browsers');
    await fs.mkdir(browserDir, { recursive: true });

    // Chrome
    try {
      const chromeDataDir = path.join(this.homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
      const chromeBackup = path.join(browserDir, 'chrome');
      await fs.mkdir(chromeBackup, { recursive: true });

      // Copy important Chrome files
      const chromeFiles = [
        'Default/Bookmarks',
        'Default/Preferences',
        'Default/Extensions',
        'Default/Login Data', // Encrypted passwords
        'Default/Login Data-journal',
        'Default/Web Data', // Autofill
        'Default/History',
        'Default/Cookies',
        'Local State',
      ];

      for (const file of chromeFiles) {
        try {
          const src = path.join(chromeDataDir, file);
          const dest = path.join(chromeBackup, file);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(src, dest);
          console.log(`   ✅ Chrome: ${file}`);
        } catch {
          // File might not exist
        }
      }

      this.manifest.sections.push({
        name: 'Chrome Browser',
        status: 'success',
        path: chromeBackup,
        notes: 'IMPORTANT: Export passwords manually from chrome://settings/passwords',
      });

      this.manifest.manualSteps.push(
        '⚠️ CHROME PASSWORDS: Go to chrome://settings/passwords → Export passwords → Save to backup folder'
      );
    } catch (e) {
      console.log('   ⚠️ Chrome backup failed');
    }

    // Edge
    try {
      const edgeDataDir = path.join(this.homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data');
      const edgeBackup = path.join(browserDir, 'edge');
      await fs.mkdir(edgeBackup, { recursive: true });

      const edgeFiles = [
        'Default/Bookmarks',
        'Default/Preferences',
        'Default/Login Data',
        'Default/Web Data',
      ];

      for (const file of edgeFiles) {
        try {
          const src = path.join(edgeDataDir, file);
          const dest = path.join(edgeBackup, file);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(src, dest);
          console.log(`   ✅ Edge: ${file}`);
        } catch {}
      }

      this.manifest.manualSteps.push(
        '⚠️ EDGE PASSWORDS: Go to edge://settings/passwords → Export passwords → Save to backup folder'
      );
    } catch {}

    // Firefox
    try {
      const firefoxDir = path.join(this.homeDir, 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles');
      const profiles = await fs.readdir(firefoxDir).catch(() => []);
      
      for (const profile of profiles) {
        if (profile.includes('default')) {
          const src = path.join(firefoxDir, profile);
          const dest = path.join(browserDir, 'firefox', profile);
          await this.copyDir(src, dest);
          console.log(`   ✅ Firefox profile: ${profile}`);
        }
      }

      this.manifest.manualSteps.push(
        '⚠️ FIREFOX PASSWORDS: Settings → Logins and Passwords → Export → Save to backup folder'
      );
    } catch {}

    console.log('');
  }

  /**
   * IDE CONFIGS - Cursor, VS Code, extensions, settings
   */
  private async backupIDEConfigs(): Promise<void> {
    console.log('💻 Backing up IDE configurations...\n');
    const ideDir = path.join(this.backupRoot, 'ide');
    await fs.mkdir(ideDir, { recursive: true });

    // Cursor settings
    try {
      const cursorDir = path.join(this.homeDir, '.cursor');
      if (await this.exists(cursorDir)) {
        await this.copyDir(cursorDir, path.join(ideDir, 'cursor-dot'));
        console.log('   ✅ Cursor: ~/.cursor');
      }

      // Cursor AppData
      const cursorAppData = path.join(this.homeDir, 'AppData', 'Roaming', 'Cursor');
      if (await this.exists(cursorAppData)) {
        // Copy specific important files, not the whole cache
        const cursorBackup = path.join(ideDir, 'cursor-appdata');
        await fs.mkdir(cursorBackup, { recursive: true });
        
        const importantFiles = ['User/settings.json', 'User/keybindings.json', 'User/snippets'];
        for (const file of importantFiles) {
          try {
            const src = path.join(cursorAppData, file);
            const dest = path.join(cursorBackup, file);
            await fs.mkdir(path.dirname(dest), { recursive: true });
            
            const stat = await fs.stat(src);
            if (stat.isDirectory()) {
              await this.copyDir(src, dest);
            } else {
              await fs.copyFile(src, dest);
            }
            console.log(`   ✅ Cursor: ${file}`);
          } catch {}
        }
      }

      // Extensions list
      const extensionsDir = path.join(this.homeDir, '.cursor', 'extensions');
      if (await this.exists(extensionsDir)) {
        const extensions = await fs.readdir(extensionsDir);
        await fs.writeFile(
          path.join(ideDir, 'cursor-extensions.txt'),
          extensions.join('\n')
        );
        console.log(`   ✅ Cursor extensions list: ${extensions.length} extensions`);
      }

      this.manifest.sections.push({
        name: 'Cursor IDE',
        status: 'success',
        path: ideDir,
      });
    } catch (e) {
      console.log('   ⚠️ Cursor backup partial');
    }

    // VS Code (in case they use it too)
    try {
      const vscodeDir = path.join(this.homeDir, '.vscode');
      if (await this.exists(vscodeDir)) {
        await this.copyDir(vscodeDir, path.join(ideDir, 'vscode-dot'));
        console.log('   ✅ VS Code: ~/.vscode');
      }

      const vscodeAppData = path.join(this.homeDir, 'AppData', 'Roaming', 'Code', 'User');
      if (await this.exists(vscodeAppData)) {
        const vscodeBackup = path.join(ideDir, 'vscode-user');
        await fs.mkdir(vscodeBackup, { recursive: true });
        
        for (const file of ['settings.json', 'keybindings.json', 'snippets']) {
          try {
            const src = path.join(vscodeAppData, file);
            const dest = path.join(vscodeBackup, file);
            const stat = await fs.stat(src);
            if (stat.isDirectory()) {
              await this.copyDir(src, dest);
            } else {
              await fs.copyFile(src, dest);
            }
            console.log(`   ✅ VS Code: ${file}`);
          } catch {}
        }
      }
    } catch {}

    console.log('');
  }

  /**
   * SSH KEYS - Critical for Git, servers, etc.
   */
  private async backupSSHKeys(): Promise<void> {
    console.log('🔑 Backing up SSH keys...\n');
    const sshDir = path.join(this.backupRoot, 'ssh');
    await fs.mkdir(sshDir, { recursive: true });

    try {
      const sshSource = path.join(this.homeDir, '.ssh');
      if (await this.exists(sshSource)) {
        await this.copyDir(sshSource, sshDir);
        console.log('   ✅ SSH keys copied');
        console.log('   ⚠️ REMEMBER: SSH keys are sensitive! Keep backup secure!');
        
        // List keys
        const files = await fs.readdir(sshSource);
        for (const file of files) {
          console.log(`      📄 ${file}`);
        }

        this.manifest.sections.push({
          name: 'SSH Keys',
          status: 'success',
          path: sshDir,
          notes: 'Contains private keys - KEEP SECURE',
        });

        this.manifest.criticalWarnings.push(
          '🔐 SSH PRIVATE KEYS backed up - Encrypt backup drive or delete after restore!'
        );
      }
    } catch {
      console.log('   ⚠️ No SSH keys found');
    }

    console.log('');
  }

  /**
   * GIT CONFIG - Global settings, credentials
   */
  private async backupGitConfig(): Promise<void> {
    console.log('📦 Backing up Git configuration...\n');
    const gitDir = path.join(this.backupRoot, 'git');
    await fs.mkdir(gitDir, { recursive: true });

    try {
      // .gitconfig
      const gitconfig = path.join(this.homeDir, '.gitconfig');
      if (await this.exists(gitconfig)) {
        await fs.copyFile(gitconfig, path.join(gitDir, '.gitconfig'));
        console.log('   ✅ .gitconfig');
      }

      // .gitignore_global
      const gitignore = path.join(this.homeDir, '.gitignore_global');
      if (await this.exists(gitignore)) {
        await fs.copyFile(gitignore, path.join(gitDir, '.gitignore_global'));
        console.log('   ✅ .gitignore_global');
      }

      // Git credentials (Windows Credential Manager handles this, but backup anyway)
      const gitCredentials = path.join(this.homeDir, '.git-credentials');
      if (await this.exists(gitCredentials)) {
        await fs.copyFile(gitCredentials, path.join(gitDir, '.git-credentials'));
        console.log('   ✅ .git-credentials');
      }

      // Export current config
      try {
        const { stdout } = await execAsync('git config --global --list', { windowsHide: true });
        await fs.writeFile(path.join(gitDir, 'git-config-list.txt'), stdout);
        console.log('   ✅ Git config exported');
      } catch {}

      this.manifest.sections.push({
        name: 'Git Configuration',
        status: 'success',
        path: gitDir,
      });
    } catch {}

    console.log('');
  }

  /**
   * WINDOWS CREDENTIALS - Stored passwords
   */
  private async backupCredentials(): Promise<void> {
    console.log('🔐 Backing up credentials...\n');
    const credDir = path.join(this.backupRoot, 'credentials');
    await fs.mkdir(credDir, { recursive: true });

    try {
      // Export Windows Credential Manager (requires admin and is limited)
      // We'll create instructions instead
      
      this.manifest.manualSteps.push(
        '⚠️ WINDOWS CREDENTIALS: Open "Credential Manager" → Web Credentials → Back up credentials',
        '⚠️ GIT CREDENTIALS: Run "cmdkey /list" and note all git-related entries'
      );

      // Try to list credentials
      try {
        const { stdout } = await execAsync('cmdkey /list', { windowsHide: true });
        await fs.writeFile(path.join(credDir, 'credential-list.txt'), stdout);
        console.log('   ✅ Credential list exported');
      } catch {}

      // GitHub CLI config
      const ghConfig = path.join(this.homeDir, '.config', 'gh');
      if (await this.exists(ghConfig)) {
        await this.copyDir(ghConfig, path.join(credDir, 'github-cli'));
        console.log('   ✅ GitHub CLI config');
      }

      // NPM config and tokens
      const npmrc = path.join(this.homeDir, '.npmrc');
      if (await this.exists(npmrc)) {
        await fs.copyFile(npmrc, path.join(credDir, '.npmrc'));
        console.log('   ✅ .npmrc (npm tokens)');
      }

      this.manifest.sections.push({
        name: 'Credentials',
        status: 'manual_required',
        path: credDir,
        notes: 'Some credentials require manual export',
      });
    } catch {}

    console.log('');
  }

  /**
   * ENVIRONMENT VARIABLES
   */
  private async backupEnvironmentVariables(): Promise<void> {
    console.log('🌍 Backing up environment variables...\n');
    const envDir = path.join(this.backupRoot, 'environment');
    await fs.mkdir(envDir, { recursive: true });

    try {
      // User environment variables
      const { stdout: userEnv } = await execAsync(
        'powershell -Command "[Environment]::GetEnvironmentVariables(\'User\') | ConvertTo-Json"',
        { windowsHide: true, maxBuffer: 1024 * 1024 }
      );
      await fs.writeFile(path.join(envDir, 'user-env-vars.json'), userEnv);
      console.log('   ✅ User environment variables');

      // System PATH
      const { stdout: pathVar } = await execAsync(
        'powershell -Command "$env:PATH -split \';\' | ConvertTo-Json"',
        { windowsHide: true }
      );
      await fs.writeFile(path.join(envDir, 'path-variable.json'), pathVar);
      console.log('   ✅ PATH variable');

      // All env vars
      const allEnv = JSON.stringify(process.env, null, 2);
      await fs.writeFile(path.join(envDir, 'all-env-vars.json'), allEnv);
      console.log('   ✅ All environment variables');

      this.manifest.sections.push({
        name: 'Environment Variables',
        status: 'success',
        path: envDir,
      });
    } catch {}

    console.log('');
  }

  /**
   * WIFI PASSWORDS
   */
  private async backupWiFiPasswords(): Promise<void> {
    console.log('📶 Backing up WiFi passwords...\n');
    const wifiDir = path.join(this.backupRoot, 'wifi');
    await fs.mkdir(wifiDir, { recursive: true });

    try {
      // Get list of profiles
      const { stdout: profiles } = await execAsync(
        'netsh wlan show profiles',
        { windowsHide: true }
      );
      
      const profileMatches = profiles.match(/All User Profile\s*:\s*(.+)/g) || [];
      const wifiData: { ssid: string; password: string }[] = [];

      for (const match of profileMatches) {
        const ssid = match.replace(/All User Profile\s*:\s*/, '').trim();
        try {
          const { stdout: details } = await execAsync(
            `netsh wlan show profile name="${ssid}" key=clear`,
            { windowsHide: true }
          );
          
          const keyMatch = details.match(/Key Content\s*:\s*(.+)/);
          const password = keyMatch ? keyMatch[1].trim() : 'Not stored';
          
          wifiData.push({ ssid, password });
          console.log(`   ✅ ${ssid}: ${password === 'Not stored' ? '(no password)' : '****'}`);
        } catch {}
      }

      await fs.writeFile(
        path.join(wifiDir, 'wifi-passwords.json'),
        JSON.stringify(wifiData, null, 2)
      );

      // Also save as plain text for easy reading
      const plainText = wifiData.map(w => `${w.ssid}: ${w.password}`).join('\n');
      await fs.writeFile(path.join(wifiDir, 'wifi-passwords.txt'), plainText);

      this.manifest.sections.push({
        name: 'WiFi Passwords',
        status: 'success',
        path: wifiDir,
        notes: `${wifiData.length} networks saved`,
      });

      this.manifest.criticalWarnings.push(
        '📶 WiFi passwords saved in plain text - SECURE THIS FILE!'
      );
    } catch {
      console.log('   ⚠️ WiFi backup failed (may need admin)');
    }

    console.log('');
  }

  /**
   * ALL PROJECTS
   */
  private async backupProjects(): Promise<void> {
    console.log('📂 Backing up projects...\n');
    const projectsDir = path.join(this.backupRoot, 'projects');
    await fs.mkdir(projectsDir, { recursive: true });

    // Main monorepo
    const monorepo = 'C:\\gcc\\cevict-app\\cevict-monorepo';
    try {
      // Copy everything except node_modules and .next
      await this.copyDirSelective(
        monorepo,
        path.join(projectsDir, 'cevict-monorepo'),
        ['node_modules', '.next', 'dist', '.git', '__pycache__', '.venv']
      );
      console.log('   ✅ cevict-monorepo');
    } catch {}

    // Copy all .env files from all projects
    const envBackup = path.join(projectsDir, '_all_env_files');
    await fs.mkdir(envBackup, { recursive: true });
    
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-ChildItem -Path '${monorepo}' -Recurse -Filter '.env*' -File | Select-Object FullName | ConvertTo-Json"`,
        { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
      );
      
      const files = JSON.parse(stdout || '[]');
      const fileList = Array.isArray(files) ? files : [files];
      
      for (const file of fileList) {
        if (file?.FullName) {
          const relativePath = file.FullName.replace(monorepo, '').replace(/\\/g, '_');
          await fs.copyFile(file.FullName, path.join(envBackup, relativePath));
          console.log(`   ✅ ENV: ${path.basename(file.FullName)}`);
        }
      }
    } catch {}

    // Forge outside monorepo
    const forge = 'C:\\gcc\\forge';
    if (await this.exists(forge)) {
      try {
        await this.copyDirSelective(
          forge,
          path.join(projectsDir, 'forge'),
          ['node_modules', '.next', 'dist']
        );
        console.log('   ✅ forge');
      } catch {}
    }

    this.manifest.sections.push({
      name: 'Projects',
      status: 'success',
      path: projectsDir,
    });

    console.log('');
  }

  /**
   * WINDOWS SETTINGS
   */
  private async backupWindowsSettings(): Promise<void> {
    console.log('⚙️ Backing up Windows settings...\n');
    const winDir = path.join(this.backupRoot, 'windows');
    await fs.mkdir(winDir, { recursive: true });

    try {
      // Windows Terminal settings
      const terminalSettings = path.join(
        this.homeDir, 'AppData', 'Local', 'Packages',
        'Microsoft.WindowsTerminal_8wekyb3d8bbwe', 'LocalState', 'settings.json'
      );
      if (await this.exists(terminalSettings)) {
        await fs.copyFile(terminalSettings, path.join(winDir, 'windows-terminal-settings.json'));
        console.log('   ✅ Windows Terminal settings');
      }

      // PowerShell profile
      const psProfile = path.join(this.homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
      if (await this.exists(psProfile)) {
        await fs.copyFile(psProfile, path.join(winDir, 'powershell-profile.ps1'));
        console.log('   ✅ PowerShell profile');
      }

      // PowerShell 7 profile
      const ps7Profile = path.join(this.homeDir, 'Documents', 'PowerShell', 'profile.ps1');
      if (await this.exists(ps7Profile)) {
        await fs.copyFile(ps7Profile, path.join(winDir, 'powershell7-profile.ps1'));
        console.log('   ✅ PowerShell 7 profile');
      }

      // Hosts file
      try {
        await fs.copyFile('C:\\Windows\\System32\\drivers\\etc\\hosts', path.join(winDir, 'hosts'));
        console.log('   ✅ hosts file');
      } catch {}

      this.manifest.sections.push({
        name: 'Windows Settings',
        status: 'success',
        path: winDir,
      });
    } catch {}

    console.log('');
  }

  /**
   * APP DATA - Important app configs
   */
  private async backupAppData(): Promise<void> {
    console.log('📱 Backing up app data...\n');
    const appDir = path.join(this.backupRoot, 'appdata');
    await fs.mkdir(appDir, { recursive: true });

    const appPaths = [
      { name: 'Postman', path: path.join(this.homeDir, 'AppData', 'Roaming', 'Postman') },
      { name: 'Discord', path: path.join(this.homeDir, 'AppData', 'Roaming', 'discord') },
      { name: 'Slack', path: path.join(this.homeDir, 'AppData', 'Roaming', 'Slack') },
      { name: 'Docker', path: path.join(this.homeDir, '.docker') },
      { name: 'AWS', path: path.join(this.homeDir, '.aws') },
      { name: 'Azure', path: path.join(this.homeDir, '.azure') },
      { name: 'Kubernetes', path: path.join(this.homeDir, '.kube') },
      { name: 'Vercel', path: path.join(this.homeDir, '.vercel') },
      { name: 'Supabase', path: path.join(this.homeDir, '.supabase') },
    ];

    for (const app of appPaths) {
      if (await this.exists(app.path)) {
        try {
          const dest = path.join(appDir, app.name.toLowerCase());
          await this.copyDirSelective(app.path, dest, ['Cache', 'CachedData', 'GPUCache', 'blob_storage']);
          console.log(`   ✅ ${app.name}`);
        } catch {}
      }
    }

    this.manifest.sections.push({
      name: 'App Data',
      status: 'success',
      path: appDir,
    });

    console.log('');
  }

  /**
   * LICENSE KEYS
   */
  private async backupLicenseKeys(): Promise<void> {
    console.log('🔑 Backing up license keys...\n');
    const licenseDir = path.join(this.backupRoot, 'licenses');
    await fs.mkdir(licenseDir, { recursive: true });

    // Create a reminder file
    const licenseReminder = `
LICENSE KEY BACKUP CHECKLIST
============================

Check these locations for license keys:

1. WINDOWS PRODUCT KEY:
   Run: wmic path softwarelicensingservice get OA3xOriginalProductKey
   Or check: Settings → System → About → Product key

2. OFFICE 365:
   Usually tied to Microsoft account - just sign in

3. ADOBE CREATIVE CLOUD:
   Tied to Adobe account - just sign in

4. JET BRAINS (if any):
   Check: Help → Register in IDE

5. SUBLIME TEXT:
   Check: Help → Enter License

6. ANY OTHER SOFTWARE:
   Check email for license confirmations
   Check password manager for license entries

IMPORTANT: 
- Most modern software uses account-based licensing
- Check your email for any license purchase confirmations
- Screenshot any license keys you see
`;

    await fs.writeFile(path.join(licenseDir, 'LICENSE_CHECKLIST.txt'), licenseReminder);

    // Try to get Windows key
    try {
      const { stdout } = await execAsync(
        'wmic path softwarelicensingservice get OA3xOriginalProductKey',
        { windowsHide: true }
      );
      if (stdout.includes('-')) {
        await fs.writeFile(path.join(licenseDir, 'windows-key.txt'), stdout);
        console.log('   ✅ Windows product key');
      }
    } catch {}

    this.manifest.manualSteps.push(
      '⚠️ LICENSE KEYS: Review the LICENSE_CHECKLIST.txt and gather all software licenses'
    );

    console.log('');
  }

  /**
   * FONTS
   */
  private async backupFonts(): Promise<void> {
    console.log('🔤 Backing up custom fonts...\n');
    const fontsDir = path.join(this.backupRoot, 'fonts');
    await fs.mkdir(fontsDir, { recursive: true });

    try {
      // User fonts
      const userFonts = path.join(this.homeDir, 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts');
      if (await this.exists(userFonts)) {
        await this.copyDir(userFonts, fontsDir);
        console.log('   ✅ User-installed fonts');
      }

      this.manifest.sections.push({
        name: 'Fonts',
        status: 'success',
        path: fontsDir,
      });
    } catch {}

    console.log('');
  }

  /**
   * DOCUMENTS AND DOWNLOADS
   */
  private async backupDocuments(): Promise<void> {
    console.log('📄 Backing up Documents and important folders...\n');
    const docsDir = path.join(this.backupRoot, 'documents');
    await fs.mkdir(docsDir, { recursive: true });

    const folders = [
      { name: 'Documents', path: path.join(this.homeDir, 'Documents') },
      { name: 'Desktop', path: path.join(this.homeDir, 'Desktop') },
      { name: 'Downloads', path: path.join(this.homeDir, 'Downloads') },
    ];

    for (const folder of folders) {
      if (await this.exists(folder.path)) {
        try {
          await this.copyDirSelective(
            folder.path,
            path.join(docsDir, folder.name),
            ['node_modules', '.next', '__pycache__']
          );
          console.log(`   ✅ ${folder.name}`);
        } catch {}
      }
    }

    this.manifest.sections.push({
      name: 'Documents',
      status: 'success',
      path: docsDir,
    });

    console.log('');
  }

  /**
   * GENERATE RESTORE SCRIPT
   */
  private async generateRestoreScript(): Promise<void> {
    console.log('📜 Generating restore script...\n');

    const restoreScript = `#!/bin/bash
#############################################
# RESTORE SCRIPT FOR LINUX
# Run this after fresh Linux install
#############################################

set -e

BACKUP_DIR="${this.backupRoot.replace(/\\/g, '/')}"
HOME_DIR="$HOME"

echo "🔄 Restoring from backup..."

# SSH Keys
if [ -d "$BACKUP_DIR/ssh" ]; then
    echo "🔑 Restoring SSH keys..."
    mkdir -p "$HOME_DIR/.ssh"
    cp -r "$BACKUP_DIR/ssh/"* "$HOME_DIR/.ssh/"
    chmod 700 "$HOME_DIR/.ssh"
    chmod 600 "$HOME_DIR/.ssh/id_*" 2>/dev/null || true
fi

# Git config
if [ -d "$BACKUP_DIR/git" ]; then
    echo "📦 Restoring Git config..."
    cp "$BACKUP_DIR/git/.gitconfig" "$HOME_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR/git/.gitignore_global" "$HOME_DIR/" 2>/dev/null || true
fi

# Projects
if [ -d "$BACKUP_DIR/projects/cevict-monorepo" ]; then
    echo "📂 Restoring projects..."
    mkdir -p "$HOME_DIR/gcc/cevict-app"
    cp -r "$BACKUP_DIR/projects/cevict-monorepo" "$HOME_DIR/gcc/cevict-app/"
fi

# AWS credentials
if [ -d "$BACKUP_DIR/appdata/aws" ]; then
    echo "☁️ Restoring AWS config..."
    cp -r "$BACKUP_DIR/appdata/aws" "$HOME_DIR/.aws"
fi

# Vercel
if [ -d "$BACKUP_DIR/appdata/vercel" ]; then
    echo "▲ Restoring Vercel config..."
    cp -r "$BACKUP_DIR/appdata/vercel" "$HOME_DIR/.vercel"
fi

# NPM
if [ -f "$BACKUP_DIR/credentials/.npmrc" ]; then
    echo "📦 Restoring npm config..."
    cp "$BACKUP_DIR/credentials/.npmrc" "$HOME_DIR/"
fi

echo ""
echo "✅ Restore complete!"
echo ""
echo "MANUAL STEPS REMAINING:"
echo "1. Import browser passwords"
echo "2. Re-authenticate with services (GitHub, Vercel, etc.)"
echo "3. Install VS Code/Cursor extensions"
echo "4. Set up WiFi networks"
`;

    await fs.writeFile(path.join(this.backupRoot, 'restore-linux.sh'), restoreScript);
    console.log('   ✅ restore-linux.sh created');
  }

  /**
   * GENERATE MANUAL CHECKLIST
   */
  private async generateManualChecklist(): Promise<void> {
    console.log('📋 Generating manual checklist...\n');

    const checklist = `
╔════════════════════════════════════════════════════════════════╗
║     📋 MANUAL STEPS BEFORE WIPING - DO THESE NOW!              ║
╚════════════════════════════════════════════════════════════════╝

CRITICAL - DO THESE BEFORE NUKING:

${this.manifest.manualSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

────────────────────────────────────────────────────────────────

VERIFY THESE ARE BACKED UP:

□ Chrome/Edge/Firefox passwords EXPORTED to file
□ 2FA recovery codes saved
□ GitHub SSH key works (test: ssh -T git@github.com)
□ All API keys from .env files
□ Stripe API keys
□ Supabase credentials
□ Vercel tokens
□ Any cryptocurrency wallets/keys
□ Important photos not in cloud
□ Downloaded purchases (software, etc.)

────────────────────────────────────────────────────────────────

SERVICES TO NOTE CREDENTIALS FOR:

□ GitHub
□ Vercel
□ Supabase
□ Stripe
□ The Odds API
□ API-Sports
□ Anthropic (Claude)
□ OpenAI
□ Sinch
□ Google Cloud
□ AWS
□ Coinbase
□ Crypto.com
□ Binance
□ Domain registrar
□ Email provider

────────────────────────────────────────────────────────────────

POST-RESTORE LINUX SETUP:

1. Run: bash restore-linux.sh
2. Run: bash scripts/linux-setup.sh
3. Import browser passwords
4. Re-authenticate services
5. Test SSH: ssh -T git@github.com
6. Test projects: cd ~/gcc/cevict-app/cevict-monorepo && pnpm install

────────────────────────────────────────────────────────────────

BACKUP LOCATION: ${this.backupRoot}

COPY THIS BACKUP TO:
□ External USB drive
□ Google Drive
□ Second location for safety

`;

    await fs.writeFile(path.join(this.backupRoot, 'MANUAL_CHECKLIST.txt'), checklist);
    console.log('   ✅ MANUAL_CHECKLIST.txt created');
  }

  /**
   * SAVE MANIFEST
   */
  private async saveManifest(): Promise<void> {
    await fs.writeFile(
      path.join(this.backupRoot, 'manifest.json'),
      JSON.stringify(this.manifest, null, 2)
    );
  }

  /**
   * PRINT SUMMARY
   */
  private printSummary(): void {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     ✅ SCORCHED EARTH BACKUP COMPLETE                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📁 Backup Location: ${this.backupRoot}`);
    console.log('');
    console.log('BACKED UP:');
    for (const section of this.manifest.sections) {
      const icon = section.status === 'success' ? '✅' : section.status === 'manual_required' ? '⚠️' : '❌';
      console.log(`   ${icon} ${section.name}`);
    }
    console.log('');
    
    if (this.manifest.criticalWarnings.length > 0) {
      console.log('⚠️ CRITICAL WARNINGS:');
      for (const warning of this.manifest.criticalWarnings) {
        console.log(`   ${warning}`);
      }
      console.log('');
    }

    console.log('📋 MANUAL STEPS REQUIRED:');
    for (const step of this.manifest.manualSteps) {
      console.log(`   ${step}`);
    }
    console.log('');
    console.log('🔥 READ MANUAL_CHECKLIST.txt BEFORE WIPING! 🔥');
    console.log('');
  }

  // Helper functions
  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async copyDirSelective(src: string, dest: string, exclude: string[]): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirSelective(srcPath, destPath, exclude);
      } else {
        try {
          await fs.copyFile(srcPath, destPath);
        } catch {}
      }
    }
  }
}

