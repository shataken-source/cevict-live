import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Strip ANSI escape codes from terminal output
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();
    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    // Sanitize: only allow openclaw subcommands, no shell injection
    const sanitized = command.replace(/[;&|`$(){}[\]<>]/g, '').trim();
    const fullCmd = `openclaw ${sanitized}`;

    const { stdout, stderr } = await execAsync(fullCmd, {
      timeout: 90000,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      shell: 'cmd.exe',
    });

    return NextResponse.json({
      success: true,
      stdout: stripAnsi(stdout || ''),
      stderr: stripAnsi(stderr || ''),
      command: fullCmd,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stdout: stripAnsi(error.stdout || ''),
      stderr: stripAnsi(error.stderr || ''),
    }, { status: 500 });
  }
}
