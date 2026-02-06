// Launchpad - Key Distribution Integration
// File: apps/launchpad/lib/key-distributor.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface KeyDistributionResult {
  app: string;
  added: number;
  skipped: number;
  missing: number;
  total: number;
}

export interface DistributionSummary {
  success: boolean;
  results: KeyDistributionResult[];
  message: string;
  output?: string;
}

export async function distributeKeys(options?: {
  dryRun?: boolean;
  scanCodebase?: boolean;
  verbose?: boolean;
  forceOverwrite?: boolean;
  backup?: boolean;
  validateKeys?: boolean;
  interactive?: boolean;
  appFilter?: string;
}): Promise<DistributionSummary> {
  // Find the script in the repo root
  const repoRoot = path.resolve(process.cwd(), '..', '..');
  const scriptPath = path.join(repoRoot, 'DISTRIBUTE_KEYS.ps1');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found at ${scriptPath}`);
  }

  try {
    // Build PowerShell command
    let cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
    if (options?.dryRun) cmd += ' -DryRun';
    if (options?.scanCodebase) cmd += ' -ScanCodebase';
    if (options?.verbose) cmd += ' -Verbose';
    if (options?.forceOverwrite) cmd += ' -ForceOverwrite';
    if (options?.backup) cmd += ' -Backup';
    if (options?.validateKeys) cmd += ' -ValidateKeys';
    if (options?.interactive) cmd += ' -Interactive';
    if (options?.appFilter) cmd += ` -AppFilter "${options.appFilter}"`;

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large output
    });

    // Parse results from output
    const results: KeyDistributionResult[] = [];
    const lines = stdout.split('\n');

    // Look for table data in the output
    let inTable = false;
    for (const line of lines) {
      if (line.includes('App') && line.includes('Added')) {
        inTable = true;
        continue;
      }
      if (inTable && line.trim() && !line.includes('---') && !line.includes('====')) {
        // Parse table row: App Added Skipped Missing Total
        const parts = line.trim().split(/\s+/).filter(p => p);
        if (parts.length >= 5) {
          const app = parts[0];
          const added = parseInt(parts[1]) || 0;
          const skipped = parseInt(parts[2]) || 0;
          const missing = parseInt(parts[3]) || 0;
          const total = parseInt(parts[4]) || 0;

          if (app && app !== 'App') {
            results.push({ app, added, skipped, missing, total });
          }
        }
      }
    }

    return {
      success: true,
      results,
      message: 'Keys distributed successfully',
      output: stdout
    };
  } catch (error: any) {
    console.error('Failed to distribute keys:', error);
    return {
      success: false,
      results: [],
      message: error.message || 'Failed to distribute keys',
      output: error.stdout || error.stderr
    };
  }
}

export async function findRequiredKeys(appPath: string): Promise<string[]> {
  const requiredKeys: string[] = [];

  try {
    // Scan TypeScript/JavaScript files for process.env references
    const files = [
      ...getFilesRecursive(appPath, ['.ts', '.tsx', '.js', '.jsx'])
    ];

    const keyPattern = /process\.env\.([A-Z_]+)|NEXT_PUBLIC_([A-Z_]+)|REACT_APP_([A-Z_]+)|VITE_([A-Z_]+)/g;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        let match;
        while ((match = keyPattern.exec(content)) !== null) {
          const key = match[1] || match[2] || match[3] || match[4];
          if (key && !requiredKeys.includes(key)) {
            requiredKeys.push(key);
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  } catch {
    // Return empty array if scanning fails
  }

  return requiredKeys.sort();
}

function getFilesRecursive(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...getFilesRecursive(fullPath, extensions));
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Skip directories that can't be read
  }

  return files;
}
