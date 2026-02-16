import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(require('child_process').exec);

const CLAWBOT_DIR = 'C:\\cevict-live\\apps\\clawbot';

export async function POST(req: NextRequest) {
  try {
    const { command, args = [] } = await req.json();

    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    // Add --allow-unconfigured for commands that need it when gateway isn't fully configured
    const needsUnconfigured = ['status', 'gateway', 'channels', 'message'].some(cmd =>
      command.startsWith(cmd)
    );
    const unconfiguredFlag = needsUnconfigured ? '--allow-unconfigured' : '';

    // Add --agent main for agent commands to use default session
    const needsAgent = command.startsWith('agent');
    const agentFlag = needsAgent ? '--agent main' : '';

    // Build command with proper flag order
    const cmd = `node openclaw.mjs ${command} ${agentFlag} ${args.join(' ')} ${unconfiguredFlag}`.trim();

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: CLAWBOT_DIR,
      timeout: 60000,
      env: {
        ...process.env,
        FORCE_COLOR: '1'
      }
    });

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
      command: cmd
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      command: error.cmd
    }, { status: 500 });
  }
}
