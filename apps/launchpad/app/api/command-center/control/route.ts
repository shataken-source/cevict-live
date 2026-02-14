import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

const PROJECT_COMMANDS: Record<string, { start: string; stop: string; restart: string }> = {
  'alpha-hunter': {
    start: 'cd C:\\cevict-live\\apps\\alpha-hunter\\environments\\prod && npm run live',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*alpha-hunter*" -and (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*live*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*alpha-hunter*" -and (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*live*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\alpha-hunter\\environments\\prod; npm run live',
  },
  'prognostication': {
    start: 'cd C:\\cevict-live\\apps\\prognostication && npm run dev',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*prognostication*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*prognostication*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\prognostication; npm run dev',
  },
  'orchestrator': {
    start: 'cd C:\\cevict-live\\apps\\ai-orchestrator && npm start',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*ai-orchestrator*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*ai-orchestrator*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\ai-orchestrator; npm start',
  },
  'progno': {
    start: 'cd C:\\cevict-live\\apps\\progno && npm run dev',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*progno*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*progno*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\progno; npm run dev',
  },
  'petreunion': {
    start: 'cd C:\\cevict-live\\apps\\petreunion && npm run dev',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*petreunion*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*petreunion*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\petreunion; npm run dev',
  },
  'popthepopcorn': {
    start: 'cd C:\\cevict-live\\apps\\popthepopcorn && npm run dev',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*popthepopcorn*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*popthepopcorn*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\popthepopcorn; npm run dev',
  },
  'smokersrights': {
    start: 'cd C:\\cevict-live\\apps\\smokersrights && npm run dev',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*smokersrights*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*smokersrights*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\smokersrights; npm run dev',
  },
  'gulfcoastcharters': {
    start: 'cd C:\\cevict-live\\apps\\gulfcoastcharters && npm run dev',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*gulfcoastcharters*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*gulfcoastcharters*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\gulfcoastcharters; npm run dev',
  },
  'wheretovacation': {
    start: 'cd C:\\cevict-live\\apps\\wheretovacation && npm run dev',
    stop: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*wheretovacation*" } | Stop-Process -Force',
    restart: 'Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*wheretovacation*" } | Stop-Process -Force; Start-Sleep -Seconds 2; cd C:\\cevict-live\\apps\\wheretovacation; npm run dev',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body.projectId;
    const action = body.action;

    if (!projectId || !action) {
      return NextResponse.json({ error: 'projectId and action are required' }, { status: 400 });
    }
    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be start, stop, or restart' }, { status: 400 });
    }
    const commands = PROJECT_COMMANDS[projectId];
    if (!commands) {
      return NextResponse.json({ error: 'Unknown project: ' + projectId }, { status: 400 });
    }
    const command = commands[action as 'start' | 'stop' | 'restart'];
    const isLocal = !process.env.VERCEL && process.platform === 'win32';
    if (!isLocal) {
      return NextResponse.json({
        success: false,
        message: 'Control commands require local access.',
        command,
        isRemote: true,
      });
    }
    const escapedCommand = command.replace(/'/g, "''").replace(/\$/g, '`$');
    if (action === 'start' || action === 'restart') {
      const escapedForArg = escapedCommand.replace(/"/g, '`"');
      const psCommand = 'powershell.exe -NoProfile -Command "Start-Process powershell -ArgumentList \'-NoProfile\', \'-Command\', \'' + escapedForArg + '\' -WindowStyle Hidden"';
      exec(psCommand, { timeout: 3000, maxBuffer: 1024 * 1024 }, (err) => { if (err) console.error(err.message); });
      return NextResponse.json({ success: true, message: 'Command started: ' + action + ' ' + projectId, command });
    }
    const psCommand = 'powershell.exe -NoProfile -Command "' + escapedCommand + '"';
    const { stdout, stderr } = await execAsync(psCommand, { timeout: 10000, maxBuffer: 1024 * 1024 });
    return NextResponse.json({ success: true, message: 'Command executed: ' + action + ' ' + projectId, command, output: stdout || stderr });
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json({ error: e.message || 'Failed to execute control command' }, { status: 500 });
  }
}
