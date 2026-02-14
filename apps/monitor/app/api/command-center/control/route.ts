import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

// Project control commands mapping - Windows PowerShell compatible
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
    const { projectId, action } = await request.json();

    if (!projectId || !action) {
      return NextResponse.json(
        { error: 'projectId and action are required' },
        { status: 400 }
      );
    }

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be start, stop, or restart' },
        { status: 400 }
      );
    }

    const commands = PROJECT_COMMANDS[projectId];
    if (!commands) {
      return NextResponse.json(
        { error: `Unknown project: ${projectId}` },
        { status: 400 }
      );
    }

    const command = commands[action as 'start' | 'stop' | 'restart'];

    // Check if running on Vercel (serverless) - commands won't work remotely
    const isVercel = !!process.env.VERCEL;
    const isLocal = !isVercel && process.platform === 'win32';
    
    if (!isLocal) {
      return NextResponse.json({
        success: false,
        message: `Control commands require local access. This feature only works when accessing from your local network.`,
        command,
        note: 'Deploy to Vercel for monitoring/metrics, but use local access or tunnel for control commands.',
        isRemote: true,
      });
    }

    try {
      // Execute command using PowerShell on Windows
      // Escape single quotes and dollar signs for PowerShell
      const escapedCommand = command.replace(/'/g, "''").replace(/\$/g, '`$');
      
      if (action === 'start' || action === 'restart') {
        // Run in background using Start-Process with hidden window
        const psCommand = `powershell.exe -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile', '-Command', '${escapedCommand.replace(/"/g, '`"')}' -WindowStyle Hidden"`;
        
        // Don't wait for completion - fire and forget
        exec(psCommand, { 
          timeout: 3000,
          maxBuffer: 1024 * 1024 
        }, (error) => {
          if (error) {
            console.error(`Background command error for ${projectId} ${action}:`, error.message);
          }
        });
        
        // Return immediately
        return NextResponse.json({
          success: true,
          message: `Command started: ${action} ${projectId}`,
          command,
        });
      } else {
        // Stop command - execute synchronously
        const psCommand = `powershell.exe -NoProfile -Command "${escapedCommand}"`;
        const { stdout, stderr } = await execAsync(psCommand, { 
          timeout: 10000,
          maxBuffer: 1024 * 1024 
        });

        return NextResponse.json({
          success: true,
          message: `Command executed: ${action} ${projectId}`,
          command,
          output: stdout || stderr,
        });
      }
    } catch (execError: any) {
      // Log error but return success for UI updates
      console.error(`Command execution error for ${projectId} ${action}:`, execError);
      
      return NextResponse.json({
        success: true,
        message: `Command attempted: ${action} ${projectId}`,
        command,
        warning: execError.message || 'Command execution may have failed',
        error: execError.stderr || execError.stdout,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to execute control command' },
      { status: 500 }
    );
  }
}

