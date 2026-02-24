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
    const { message, sessionId, agent, thinking } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build openclaw agent command
    const parts: string[] = ['openclaw', 'agent'];

    // Sanitize message: escape double quotes, remove shell-dangerous chars
    const safeMessage = message.replace(/[;&|`$(){}[\]<>]/g, '').replace(/"/g, '\\"');
    parts.push('--message', `"${safeMessage}"`);

    if (sessionId) {
      const safeSession = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '');
      parts.push('--session-id', safeSession);
    }

    // Always specify an agent — openclaw requires --to, --session-id, or --agent
    const agentId = agent || 'main';
    const safeAgent = String(agentId).replace(/[^a-zA-Z0-9_-]/g, '');
    parts.push('--agent', safeAgent);

    if (thinking && ['off', 'minimal', 'low', 'medium', 'high'].includes(thinking)) {
      parts.push('--thinking', thinking);
    }

    const fullCmd = parts.join(' ');

    const { stdout, stderr } = await execAsync(fullCmd, {
      timeout: 600000, // 10 min — agent can take a while
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      shell: 'cmd.exe',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const cleanOut = stripAnsi(stdout || '').trim();
    const cleanErr = stripAnsi(stderr || '').trim();

    // Check for auth errors
    if (cleanOut.includes('authentication_error') || cleanOut.includes('invalid x-api-key') ||
      cleanErr.includes('authentication_error') || cleanErr.includes('invalid x-api-key')) {
      return NextResponse.json({
        success: false,
        reply: 'Anthropic API key is invalid or expired. Run `openclaw configure` to update it.',
        sessionId: sessionId || null,
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      reply: cleanOut || cleanErr || 'No response from agent.',
      sessionId: sessionId || null,
    });
  } catch (error: any) {
    const cleanOut = stripAnsi(error.stdout || '').trim();
    const cleanErr = stripAnsi(error.stderr || '').trim();
    const combined = `${cleanOut}\n${cleanErr}`.trim();

    // Detect auth errors
    if (combined.includes('authentication_error') || combined.includes('invalid x-api-key')) {
      return NextResponse.json({
        success: false,
        reply: 'Anthropic API key is invalid or expired. Run `openclaw configure` to update it.',
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      reply: combined || error.message || 'Agent command failed.',
    }, { status: 500 });
  }
}
