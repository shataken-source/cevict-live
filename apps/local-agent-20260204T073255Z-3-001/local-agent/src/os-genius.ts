/**
 * OS Genius - Windows & Linux Expert
 * Understands both OS, converts commands, handles migrations
 */

import { guiGenius } from './gui-genius.js';
import { guiController } from './gui-controller.js';
import * as os from 'os';
import * as path from 'path';

export type OperatingSystem = 'windows' | 'linux' | 'unknown';

interface OSCommand {
  windows: string;
  linux: string;
  description: string;
}

export class OSGenius {
  private currentOS: OperatingSystem;
  private workspacePath: string;

  constructor() {
    this.currentOS = this.detectOS();
    this.workspacePath = process.env.WORKSPACE_PATH || 
      (this.currentOS === 'windows' 
        ? 'C:\\gcc\\cevict-app\\cevict-monorepo'
        : '/home/user/cevict-monorepo');
  }

  /**
   * Detect current operating system
   */
  detectOS(): OperatingSystem {
    const platform = os.platform();
    if (platform === 'win32') return 'windows';
    if (platform === 'linux') return 'linux';
    return 'unknown';
  }

  /**
   * Get current OS
   */
  getCurrentOS(): OperatingSystem {
    return this.currentOS;
  }

  /**
   * Convert Windows command to Linux
   */
  convertToLinux(windowsCommand: string): string {
    let linuxCommand = windowsCommand;

    // Path conversions
    linuxCommand = linuxCommand.replace(/C:\\/g, '/home/user/');
    linuxCommand = linuxCommand.replace(/\\/g, '/');
    linuxCommand = linuxCommand.replace(/C:/g, '/home/user');

    // Command conversions
    const commandMap: Record<string, string> = {
      'dir': 'ls',
      'cd': 'cd',
      'type': 'cat',
      'copy': 'cp',
      'move': 'mv',
      'del': 'rm',
      'rmdir': 'rmdir',
      'md': 'mkdir',
      'cls': 'clear',
      'echo': 'echo',
      'find': 'grep',
      'findstr': 'grep',
      'where': 'which',
      'set': 'export',
      'setx': 'export',
      'tasklist': 'ps aux',
      'taskkill': 'kill',
      'ipconfig': 'ifconfig',
      'ping': 'ping',
      'netstat': 'netstat',
      'systeminfo': 'uname -a',
      'wmic': 'dmidecode',
      'powershell': 'bash',
      'cmd': 'bash',
    };

    // Convert commands
    for (const [win, lin] of Object.entries(commandMap)) {
      const regex = new RegExp(`^${win}\\s+`, 'i');
      if (regex.test(linuxCommand)) {
        linuxCommand = linuxCommand.replace(regex, `${lin} `);
      }
    }

    // PowerShell to Bash
    linuxCommand = linuxCommand.replace(/\$env:/g, '$');
    linuxCommand = linuxCommand.replace(/Get-Content/g, 'cat');
    linuxCommand = linuxCommand.replace(/Set-Content/g, 'echo');
    linuxCommand = linuxCommand.replace(/Test-Path/g, 'test -f');
    linuxCommand = linuxCommand.replace(/-Path/g, '');
    linuxCommand = linuxCommand.replace(/-Value/g, '');

    return linuxCommand;
  }

  /**
   * Convert Linux command to Windows
   */
  convertToWindows(linuxCommand: string): string {
    let windowsCommand = linuxCommand;

    // Path conversions
    windowsCommand = windowsCommand.replace(/\/home\/user\//g, 'C:\\');
    windowsCommand = windowsCommand.replace(/\//g, '\\');

    // Command conversions
    const commandMap: Record<string, string> = {
      'ls': 'dir',
      'cd': 'cd',
      'cat': 'type',
      'cp': 'copy',
      'mv': 'move',
      'rm': 'del',
      'rmdir': 'rmdir',
      'mkdir': 'md',
      'clear': 'cls',
      'echo': 'echo',
      'grep': 'findstr',
      'which': 'where',
      'export': 'set',
      'ps aux': 'tasklist',
      'kill': 'taskkill',
      'ifconfig': 'ipconfig',
      'ping': 'ping',
      'netstat': 'netstat',
      'uname -a': 'systeminfo',
      'dmidecode': 'wmic',
      'bash': 'powershell',
      'sh': 'cmd',
    };

    // Convert commands
    for (const [lin, win] of Object.entries(commandMap)) {
      const regex = new RegExp(`^${lin}\\s+`, 'i');
      if (regex.test(windowsCommand)) {
        windowsCommand = windowsCommand.replace(regex, `${win} `);
      }
    }

    // Bash to PowerShell
    windowsCommand = windowsCommand.replace(/\$([A-Z_]+)/g, '$env:$1');
    windowsCommand = windowsCommand.replace(/cat\s+/g, 'Get-Content ');
    windowsCommand = windowsCommand.replace(/echo\s+/g, 'Set-Content ');
    windowsCommand = windowsCommand.replace(/test -f/g, 'Test-Path');

    return windowsCommand;
  }

  /**
   * Convert path between OS
   */
  convertPath(filePath: string, targetOS: OperatingSystem): string {
    if (targetOS === 'windows') {
      // Convert to Windows path
      let winPath = filePath.replace(/^\/home\/user\//, 'C:\\');
      winPath = winPath.replace(/\//g, '\\');
      return winPath;
    } else {
      // Convert to Linux path
      let linPath = filePath.replace(/^C:\\/, '/home/user/');
      linPath = linPath.replace(/\\/g, '/');
      return linPath;
    }
  }

  /**
   * Execute command on current OS
   */
  async executeCommand(command: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
    os: OperatingSystem;
  }> {
    // Detect if command is for different OS
    const isWindowsCommand = /^(dir|type|copy|move|del|md|cls|findstr|where|set|tasklist|taskkill|ipconfig|systeminfo|wmic|powershell|cmd)/i.test(command);
    const isLinuxCommand = /^(ls|cat|cp|mv|rm|mkdir|clear|grep|which|export|ps|kill|ifconfig|uname|dmidecode|bash|sh)/i.test(command);

    let finalCommand = command;

    // Convert if needed
    if (this.currentOS === 'windows' && isLinuxCommand) {
      finalCommand = this.convertToWindows(command);
      console.log(`🔄 Converted Linux command to Windows: ${finalCommand}`);
    } else if (this.currentOS === 'linux' && isWindowsCommand) {
      finalCommand = this.convertToLinux(command);
      console.log(`🔄 Converted Windows command to Linux: ${finalCommand}`);
    }

    // Execute via GUI Controller
    const result = await guiController.executeCommand(finalCommand);
    
    return {
      ...result,
      os: this.currentOS,
    };
  }

  /**
   * Smart OS operation - understands what OS and converts automatically
   */
  async smartOSOperation(instruction: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
    os: OperatingSystem;
    converted?: boolean;
  }> {
    const lower = instruction.toLowerCase();

    // Detect OS-specific operations
    if (lower.includes('windows') || lower.includes('win32') || lower.includes('powershell')) {
      if (this.currentOS === 'linux') {
        // Need to convert Windows command to Linux
        const windowsPart = instruction.match(/(?:windows|win32|powershell)[^:]*:\s*(.+)/i);
        if (windowsPart) {
          const converted = this.convertToLinux(windowsPart[1]);
          return await this.executeCommand(converted);
        }
      }
    }

    if (lower.includes('linux') || lower.includes('unix') || lower.includes('bash')) {
      if (this.currentOS === 'windows') {
        // Need to convert Linux command to Windows
        const linuxPart = instruction.match(/(?:linux|unix|bash)[^:]*:\s*(.+)/i);
        if (linuxPart) {
          const converted = this.convertToWindows(linuxPart[1]);
          return await this.executeCommand(converted);
        }
      }
    }

    // Migration operations
    if (lower.includes('migrate') || lower.includes('convert') || lower.includes('port')) {
      return await this.handleMigration(instruction);
    }

    // Default: execute as-is (will auto-convert if needed)
    const result = await this.executeCommand(instruction);
    return {
      ...result,
      converted: result.output.includes('Converted'),
    };
  }

  /**
   * Handle migration operations
   */
  private async handleMigration(instruction: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
    os: OperatingSystem;
  }> {
    const lower = instruction.toLowerCase();

    // Detect migration type
    if (lower.includes('windows to linux') || lower.includes('win to lin')) {
      return await this.migrateWindowsToLinux(instruction);
    }

    if (lower.includes('linux to windows') || lower.includes('lin to win')) {
      return await this.migrateLinuxToWindows(instruction);
    }

    // Default migration
    return {
      success: false,
      output: '',
      error: 'Migration type not specified. Use "migrate windows to linux" or "migrate linux to windows"',
      os: this.currentOS,
    };
  }

  /**
   * Migrate from Windows to Linux
   */
  private async migrateWindowsToLinux(instruction: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
    os: OperatingSystem;
  }> {
    console.log('🔄 Migrating from Windows to Linux...');

    const migrationTasks = [
      'Convert all file paths',
      'Convert all commands',
      'Update package.json scripts',
      'Update environment variables',
      'Convert batch files to shell scripts',
      'Update documentation',
    ];

    const results: string[] = [];

    for (const task of migrationTasks) {
      try {
        // Use GUI Genius to handle migration
        const result = await guiGenius.executeWithIntelligence(
          `Migrate ${task.toLowerCase()} from Windows to Linux`
        );
        
        if (result.success) {
          results.push(`✅ ${task}: Success`);
        } else {
          results.push(`⚠️ ${task}: ${result.error || 'Partial success'}`);
        }
      } catch (error: any) {
        results.push(`❌ ${task}: ${error.message}`);
      }
    }

    return {
      success: true,
      output: results.join('\n'),
      os: 'linux',
    };
  }

  /**
   * Migrate from Linux to Windows
   */
  private async migrateLinuxToWindows(instruction: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
    os: OperatingSystem;
  }> {
    console.log('🔄 Migrating from Linux to Windows...');

    const migrationTasks = [
      'Convert all file paths',
      'Convert all commands',
      'Update package.json scripts',
      'Update environment variables',
      'Convert shell scripts to batch files',
      'Update documentation',
    ];

    const results: string[] = [];

    for (const task of migrationTasks) {
      try {
        // Use GUI Genius to handle migration
        const result = await guiGenius.executeWithIntelligence(
          `Migrate ${task.toLowerCase()} from Linux to Windows`
        );
        
        if (result.success) {
          results.push(`✅ ${task}: Success`);
        } else {
          results.push(`⚠️ ${task}: ${result.error || 'Partial success'}`);
        }
      } catch (error: any) {
        results.push(`❌ ${task}: ${error.message}`);
      }
    }

    return {
      success: true,
      output: results.join('\n'),
      os: 'windows',
    };
  }

  /**
   * Get OS-specific information
   */
  getOSInfo(): {
    os: OperatingSystem;
    platform: string;
    arch: string;
    homedir: string;
    workspacePath: string;
    pathSeparator: string;
    commandExamples: OSCommand[];
  } {
    return {
      os: this.currentOS,
      platform: os.platform(),
      arch: os.arch(),
      homedir: os.homedir(),
      workspacePath: this.workspacePath,
      pathSeparator: this.currentOS === 'windows' ? '\\' : '/',
      commandExamples: [
        {
          windows: 'dir',
          linux: 'ls',
          description: 'List directory contents',
        },
        {
          windows: 'type file.txt',
          linux: 'cat file.txt',
          description: 'Display file contents',
        },
        {
          windows: 'copy file1.txt file2.txt',
          linux: 'cp file1.txt file2.txt',
          description: 'Copy file',
        },
        {
          windows: 'move file1.txt file2.txt',
          linux: 'mv file1.txt file2.txt',
          description: 'Move/rename file',
        },
        {
          windows: 'del file.txt',
          linux: 'rm file.txt',
          description: 'Delete file',
        },
        {
          windows: 'md folder',
          linux: 'mkdir folder',
          description: 'Create directory',
        },
        {
          windows: 'findstr "text" file.txt',
          linux: 'grep "text" file.txt',
          description: 'Search text in file',
        },
        {
          windows: 'where command',
          linux: 'which command',
          description: 'Find command location',
        },
        {
          windows: 'set VAR=value',
          linux: 'export VAR=value',
          description: 'Set environment variable',
        },
        {
          windows: 'tasklist',
          linux: 'ps aux',
          description: 'List running processes',
        },
        {
          windows: 'taskkill /PID 1234',
          linux: 'kill 1234',
          description: 'Kill process',
        },
        {
          windows: 'ipconfig',
          linux: 'ifconfig',
          description: 'Network configuration',
        },
      ],
    };
  }

  /**
   * Check if command is cross-platform compatible
   */
  isCrossPlatform(command: string): boolean {
    const crossPlatformCommands = [
      'cd', 'echo', 'ping', 'netstat', 'node', 'npm', 'pnpm', 'git',
      'python', 'python3', 'java', 'gcc', 'make', 'cmake',
    ];

    return crossPlatformCommands.some(cmd => 
      command.toLowerCase().startsWith(cmd.toLowerCase())
    );
  }

  /**
   * Generate migration script
   */
  async generateMigrationScript(
    sourceOS: OperatingSystem,
    targetOS: OperatingSystem,
    files: string[]
  ): Promise<{
    success: boolean;
    script: string;
    error?: string;
  }> {
    const script: string[] = [];

    if (sourceOS === 'windows' && targetOS === 'linux') {
      script.push('#!/bin/bash');
      script.push('# Migration script: Windows to Linux');
      script.push('');
      
      for (const file of files) {
        const linuxPath = this.convertPath(file, 'linux');
        script.push(`# Convert ${file} to ${linuxPath}`);
        script.push(`# Update paths, commands, etc.`);
      }
    } else if (sourceOS === 'linux' && targetOS === 'windows') {
      script.push('@echo off');
      script.push('REM Migration script: Linux to Windows');
      script.push('');
      
      for (const file of files) {
        const windowsPath = this.convertPath(file, 'windows');
        script.push(`REM Convert ${file} to ${windowsPath}`);
        script.push(`REM Update paths, commands, etc.`);
      }
    }

    return {
      success: true,
      script: script.join('\n'),
    };
  }
}

export const osGenius = new OSGenius();

