/**
 * 🏰 Bootstrap API Routes
 * 
 * POST /bootstrap/linux - Run full Linux bootstrap
 * GET /bootstrap/status - Check what's installed
 */

import { Router, Request, Response } from 'express';
import { runBootstrap, checkAndBootstrapIfNeeded } from '../linux-bootstrap';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// Check if a command exists
async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execAsync(`which ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

// Check if a service is active
async function serviceIsActive(service: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`systemctl is-active ${service}`);
    return stdout.trim() === 'active';
  } catch {
    return false;
  }
}

/**
 * GET /bootstrap/status
 * Check what components are installed
 */
router.get('/status', async (req: Request, res: Response) => {
  const isLinux = os.platform() === 'linux';

  if (!isLinux) {
    return res.json({
      platform: os.platform(),
      message: 'Bootstrap is for Linux systems only',
      ready: false,
    });
  }

  try {
    const [
      hasNode,
      hasPnpm,
      hasPython,
      hasRedis,
      hasFzf,
      hasJq,
      redisActive,
    ] = await Promise.all([
      commandExists('node'),
      commandExists('pnpm'),
      commandExists('python3'),
      commandExists('redis-server'),
      commandExists('fzf'),
      commandExists('jq'),
      serviceIsActive('redis-server'),
    ]);

    // Get versions
    let nodeVersion = '';
    let pnpmVersion = '';
    let pythonVersion = '';

    if (hasNode) {
      const { stdout } = await execAsync('node -v');
      nodeVersion = stdout.trim();
    }
    if (hasPnpm) {
      const { stdout } = await execAsync('pnpm -v');
      pnpmVersion = stdout.trim();
    }
    if (hasPython) {
      const { stdout } = await execAsync('python3 --version');
      pythonVersion = stdout.trim();
    }

    const status = {
      platform: os.platform(),
      hostname: os.hostname(),
      user: os.userInfo().username,
      homeDir: os.homedir(),
      components: {
        node: { installed: hasNode, version: nodeVersion },
        pnpm: { installed: hasPnpm, version: pnpmVersion },
        python: { installed: hasPython, version: pythonVersion },
        redis: { installed: hasRedis, active: redisActive },
        fzf: { installed: hasFzf },
        jq: { installed: hasJq },
      },
      ready: hasNode && hasPnpm && hasPython && redisActive,
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /bootstrap/linux
 * Run the full Linux bootstrap
 */
router.post('/linux', async (req: Request, res: Response) => {
  const isLinux = os.platform() === 'linux';

  if (!isLinux) {
    return res.status(400).json({
      success: false,
      error: 'Bootstrap is for Linux systems only',
      platform: os.platform(),
    });
  }

  try {
    // Run bootstrap (this may take a while)
    res.setHeader('Content-Type', 'application/json');
    
    const result = await runBootstrap();
    
    res.json({
      success: result.success,
      steps: result.steps,
      duration: `${(result.duration / 1000).toFixed(1)}s`,
      message: result.success 
        ? 'Bootstrap complete! Run: source ~/.bashrc' 
        : 'Bootstrap had failures. Check steps for details.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Bootstrap failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /bootstrap/check
 * Check if bootstrap is needed and run if so
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    await checkAndBootstrapIfNeeded();
    res.json({ success: true, message: 'Bootstrap check complete' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

