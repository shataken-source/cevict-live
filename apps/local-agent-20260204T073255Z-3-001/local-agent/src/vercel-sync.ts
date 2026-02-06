/**
 * 🔄 Vercel Environment Sync
 * 
 * Syncs local .env.local files to Vercel projects.
 * Part of the Local Agent automation suite.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Project mappings: local folder → Vercel project name
export const PROJECT_MAPPINGS: Record<string, string> = {
  'progno': 'progno',
  'prognostication': 'prognostication',
  'cevict': 'cevict',
  'cevict-ai': 'cevict-ai',
  'smokersrights': 'smokersrights',
  'petreunion': 'petreunion',
  'popthepopcorn': 'popthepopcorn',
  'wheretovacation': 'wheretovacation',
  'auspicio': 'auspicio',
  'launchpad': 'launchpad',
};

// Variables to exclude from sync
const EXCLUDE_VARS = [
  'VERCEL_OIDC_TOKEN',
  'NODE_ENV',
  'WORKSPACE_PATH',
  'AGENT_PORT',
  'BYPASS_RATE_LIMIT',
  'BYPASS_CONSENT',
  'MY_PERSONAL_NUMBER',
  'ADMIN_PASSWORD',
];

interface EnvVar {
  key: string;
  value: string;
}

interface SyncResult {
  project: string;
  vercelProject: string;
  synced: number;
  existed: number;
  failed: number;
  skipped: boolean;
  errors: string[];
}

export class VercelSync {
  private monorepoRoot: string;
  private appsDir: string;
  private scope: string;

  constructor(monorepoRoot?: string) {
    this.monorepoRoot = monorepoRoot || process.env.WORKSPACE_PATH || 'C:\\gcc\\cevict-app\\cevict-monorepo';
    this.appsDir = path.join(this.monorepoRoot, 'apps');
    this.scope = 'shataken-sources-projects';
  }

  /**
   * Parse an .env.local file into key-value pairs
   */
  parseEnvFile(filePath: string): EnvVar[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const vars: EnvVar[] = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse KEY=VALUE
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Skip excluded vars and empty values
      if (EXCLUDE_VARS.includes(key) || !value) continue;

      vars.push({ key, value });
    }

    return vars;
  }

  /**
   * Get current Vercel env vars for a project
   */
  async getVercelEnvVars(projectName: string): Promise<string[]> {
    try {
      const result = execSync(
        `vercel env ls --scope ${this.scope}`,
        {
          encoding: 'utf8',
          cwd: path.join(this.appsDir, projectName),
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
      
      // Parse the output to get existing var names
      const lines = result.split('\n');
      const vars: string[] = [];
      
      for (const line of lines) {
        // Look for lines that look like "VARIABLE_NAME   production   ..."
        const match = line.match(/^\s*(\w+)\s+/);
        if (match) {
          vars.push(match[1]);
        }
      }
      
      return vars;
    } catch {
      return [];
    }
  }

  /**
   * Add an env var to Vercel
   */
  async addEnvVar(
    projectName: string, 
    key: string, 
    value: string, 
    environment: 'production' | 'preview' | 'development' = 'production'
  ): Promise<{ success: boolean; exists?: boolean; error?: string }> {
    try {
      // Use vercel env add with piped value
      const cmd = process.platform === 'win32'
        ? `echo ${value}| vercel env add ${key} ${environment} --scope ${this.scope} --yes`
        : `echo "${value}" | vercel env add ${key} ${environment} --scope ${this.scope} --yes`;

      execSync(cmd, {
        encoding: 'utf8',
        cwd: path.join(this.appsDir, projectName),
        stdio: 'pipe',
        shell: true,
      });

      return { success: true };
    } catch (error: any) {
      const msg = error.message || '';
      
      if (msg.includes('already exists') || msg.includes('already defined')) {
        return { success: true, exists: true };
      }
      
      return { success: false, error: msg.substring(0, 100) };
    }
  }

  /**
   * Remove an env var from Vercel
   */
  async removeEnvVar(
    projectName: string,
    key: string,
    environment: 'production' | 'preview' | 'development' = 'production'
  ): Promise<boolean> {
    try {
      execSync(
        `vercel env rm ${key} ${environment} --scope ${this.scope} --yes`,
        {
          encoding: 'utf8',
          cwd: path.join(this.appsDir, projectName),
          stdio: 'pipe',
        }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Link a local folder to a Vercel project
   */
  async linkProject(localFolder: string, vercelProject: string): Promise<boolean> {
    try {
      execSync(
        `vercel link --project=${vercelProject} --scope=${this.scope} --yes`,
        {
          encoding: 'utf8',
          cwd: path.join(this.appsDir, localFolder),
          stdio: 'pipe',
        }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sync a single project's env vars to Vercel
   */
  async syncProject(appName: string, dryRun = false): Promise<SyncResult> {
    const vercelProject = PROJECT_MAPPINGS[appName];
    
    const result: SyncResult = {
      project: appName,
      vercelProject: vercelProject || 'unknown',
      synced: 0,
      existed: 0,
      failed: 0,
      skipped: false,
      errors: [],
    };

    if (!vercelProject) {
      result.skipped = true;
      result.errors.push('No Vercel project mapping');
      return result;
    }

    const envPath = path.join(this.appsDir, appName, '.env.local');
    const vars = this.parseEnvFile(envPath);

    if (vars.length === 0) {
      result.skipped = true;
      result.errors.push('No env vars found');
      return result;
    }

    if (dryRun) {
      console.log(`\n📦 ${appName} → ${vercelProject} (DRY RUN)`);
      console.log(`   Would sync ${vars.length} variables:`);
      vars.forEach(v => console.log(`   - ${v.key}`));
      return result;
    }

    console.log(`\n📦 Syncing ${appName} → ${vercelProject}`);

    // Link project first
    await this.linkProject(appName, vercelProject);

    // Sync each variable to production and preview
    for (const { key, value } of vars) {
      process.stdout.write(`   ${key}... `);

      // Add to production
      const prodResult = await this.addEnvVar(appName, key, value, 'production');
      
      // Add to preview
      await this.addEnvVar(appName, key, value, 'preview');

      if (prodResult.success) {
        if (prodResult.exists) {
          console.log('✓ (exists)');
          result.existed++;
        } else {
          console.log('✓');
          result.synced++;
        }
      } else {
        console.log('✗');
        result.failed++;
        result.errors.push(`${key}: ${prodResult.error}`);
      }
    }

    return result;
  }

  /**
   * Sync all mapped projects
   */
  async syncAll(dryRun = false): Promise<SyncResult[]> {
    console.log('🔄 VERCEL ENV SYNC');
    console.log('═'.repeat(50));
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE SYNC'}`);
    console.log(`Scope: ${this.scope}`);
    console.log('═'.repeat(50));

    const results: SyncResult[] = [];

    for (const appName of Object.keys(PROJECT_MAPPINGS)) {
      const result = await this.syncProject(appName, dryRun);
      results.push(result);
    }

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 SYNC SUMMARY');
    console.log('═'.repeat(50));

    let totalSynced = 0;
    let totalExisted = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const result of results) {
      if (result.skipped) {
        totalSkipped++;
      } else {
        totalSynced += result.synced;
        totalExisted += result.existed;
        totalFailed += result.failed;
      }
    }

    console.log(`   ✅ Synced: ${totalSynced}`);
    console.log(`   ✓ Existed: ${totalExisted}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
    console.log(`   ✗ Failed: ${totalFailed}`);

    return results;
  }

  /**
   * Get status of all projects
   */
  getStatus(): { project: string; vercelProject: string; envFile: boolean; varCount: number }[] {
    const status: { project: string; vercelProject: string; envFile: boolean; varCount: number }[] = [];

    for (const [appName, vercelProject] of Object.entries(PROJECT_MAPPINGS)) {
      const envPath = path.join(this.appsDir, appName, '.env.local');
      const exists = fs.existsSync(envPath);
      const vars = exists ? this.parseEnvFile(envPath) : [];

      status.push({
        project: appName,
        vercelProject,
        envFile: exists,
        varCount: vars.length,
      });
    }

    return status;
  }
}

// Export singleton
export const vercelSync = new VercelSync();

