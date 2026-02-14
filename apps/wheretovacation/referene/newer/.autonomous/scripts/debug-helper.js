#!/usr/bin/env node

/**
 * Debug Helper Utilities
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DebugHelper {
  constructor() {
    this.debugDir = path.join(__dirname, '../debug');
    this.logsDir = path.join(this.debugDir, 'logs');
    this.snapshotsDir = path.join(this.debugDir, 'snapshots');
    this.errorsDir = path.join(this.debugDir, 'errors');

    // Ensure directories exist
    [this.logsDir, this.snapshotsDir, this.errorsDir].forEach(dir => {
      fs.mkdirSync(dir, { recursive: true });
    });
  }

  /**
   * Save code snapshot
   */
  saveSnapshot(filePath, description = '') {
    try {
      const fullPath = path.resolve(filePath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`[DEBUG] File not found: ${fullPath}`);
        return null;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      const snapshotPath = path.join(
        this.snapshotsDir,
        `${path.basename(fullPath)}-${Date.now()}${description ? `-${description}` : ''}.snapshot`
      );

      fs.writeFileSync(snapshotPath, content);
      console.log(`[DEBUG] Snapshot saved: ${snapshotPath}`);
      return snapshotPath;
    } catch (error) {
      console.error(`[DEBUG] Failed to save snapshot: ${error.message}`);
      return null;
    }
  }

  /**
   * Log debug message
   */
  log(message, level = 'info') {
    const logFile = path.join(this.logsDir, `debug-${new Date().toISOString().split('T')[0]}.log`);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    fs.appendFileSync(logFile, logEntry);
    console.log(`[DEBUG] ${message}`);
  }

  /**
   * Save error
   */
  saveError(error, context = {}) {
    const errorData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    };

    const errorPath = path.join(this.errorsDir, `error-${Date.now()}.json`);
    fs.writeFileSync(errorPath, JSON.stringify(errorData, null, 2));
    console.log(`[DEBUG] Error saved: ${errorPath}`);
    return errorPath;
  }

  /**
   * Check for common issues
   */
  async checkHealth() {
    const issues = [];

    // Check if build works
    try {
      const { stderr } = await execAsync('pnpm run build', {
        cwd: path.join(__dirname, '../../..'),
        timeout: 60000
      });
      if (stderr && stderr.includes('error')) {
        issues.push('Build has errors');
      }
    } catch (error) {
      issues.push(`Build failed: ${error.message}`);
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        issues.push(`Missing environment variable: ${varName}`);
      }
    });

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    const errors = fs.readdirSync(this.errorsDir)
      .map(file => ({
        path: path.join(this.errorsDir, file),
        mtime: fs.statSync(path.join(this.errorsDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit);

    return errors.map(err => {
      try {
        return {
          ...err,
          content: JSON.parse(fs.readFileSync(err.path, 'utf8'))
        };
      } catch {
        return err;
      }
    });
  }
}

// CLI
if (require.main === module) {
  const helper = new DebugHelper();
  const args = process.argv.slice(2);

  if (args.includes('--check')) {
    helper.checkHealth().then(({ healthy, issues }) => {
      if (healthy) {
        console.log('[DEBUG] System is healthy');
      } else {
        console.log('[DEBUG] Issues found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
      }
    });
  } else if (args.includes('--errors')) {
    const errors = helper.getRecentErrors();
    console.log(`[DEBUG] Recent errors (${errors.length}):`);
    errors.forEach(err => {
      console.log(`  - ${err.path}`);
      if (err.content) {
        console.log(`    ${err.content.error.message}`);
      }
    });
  } else {
    console.log('Usage:');
    console.log('  --check    Check system health');
    console.log('  --errors   Show recent errors');
  }
}

module.exports = DebugHelper;












