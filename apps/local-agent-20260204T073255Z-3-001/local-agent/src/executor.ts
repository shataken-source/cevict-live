/**
 * Command Executor
 * Executes terminal commands on the local machine
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class CommandExecutor {
  private workspace: string;
  private history: { command: string; result: ExecutionResult; timestamp: Date }[] = [];

  constructor(workspace: string) {
    this.workspace = workspace;
  }

  async run(command: string, cwd?: string): Promise<ExecutionResult> {
    const workDir = cwd ? path.join(this.workspace, cwd) : this.workspace;
    const startTime = Date.now();

    console.log(`\n💻 Executing: ${command}`);
    console.log(`   Directory: ${workDir}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workDir,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        windowsHide: true,
        shell: 'powershell.exe',
      });

      const result: ExecutionResult = {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        duration: Date.now() - startTime,
      };

      this.logExecution(command, result);
      console.log(`   ✅ Completed in ${result.duration}ms`);
      if (result.stdout) console.log(`   Output: ${result.stdout.slice(0, 200)}...`);

      return result;
    } catch (error: any) {
      const result: ExecutionResult = {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        exitCode: error.code || 1,
        duration: Date.now() - startTime,
      };

      this.logExecution(command, result);
      console.log(`   ❌ Failed with code ${result.exitCode}`);
      if (result.stderr) console.log(`   Error: ${result.stderr.slice(0, 200)}`);

      return result;
    }
  }

  async runBackground(command: string, cwd?: string): Promise<number> {
    const workDir = cwd ? path.join(this.workspace, cwd) : this.workspace;

    console.log(`\n🔄 Starting background: ${command}`);

    const child = spawn(command, [], {
      cwd: workDir,
      shell: 'powershell.exe',
      detached: true,
      stdio: 'ignore',
    });

    child.unref();
    console.log(`   PID: ${child.pid}`);

    return child.pid || 0;
  }

  async runWithStream(
    command: string,
    onOutput: (data: string) => void,
    cwd?: string
  ): Promise<ExecutionResult> {
    const workDir = cwd ? path.join(this.workspace, cwd) : this.workspace;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const child = spawn(command, [], {
        cwd: workDir,
        shell: 'powershell.exe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        onOutput(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        onOutput(text);
      });

      child.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
          duration: Date.now() - startTime,
        });
      });
    });
  }

  private logExecution(command: string, result: ExecutionResult): void {
    this.history.push({
      command,
      result,
      timestamp: new Date(),
    });

    // Keep last 100 commands
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  getHistory(): typeof this.history {
    return this.history;
  }
}

