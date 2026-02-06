import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { token, teamId } = await req.json().catch(() => ({}));

    // Try to get token from environment if not provided
    const vercelToken = token || process.env.VERCEL_TOKEN || process.env.NEXT_PUBLIC_VERCEL_TOKEN;

    if (!vercelToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'VERCEL_TOKEN is required. Get it from: https://vercel.com/account/tokens or set VERCEL_TOKEN environment variable'
        },
        { status: 400 }
      );
    }

    // Path to the cancellation script
    const scriptPath = path.join(process.cwd(), 'scripts', 'cancel-vercel-deployments.js');

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cancellation script not found. Make sure scripts/cancel-vercel-deployments.js exists.'
        },
        { status: 404 }
      );
    }

    // Build command with token
    const env = {
      ...process.env,
      VERCEL_TOKEN: vercelToken,
      ...(teamId ? { VERCEL_TEAM_ID: teamId } : {}),
    };

    const envString = Object.entries(env)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ');

    const command = process.platform === 'win32'
      ? `set VERCEL_TOKEN=${vercelToken} && node ${scriptPath}`
      : `${envString} node ${scriptPath}`;

    console.log('[Vercel Cancel] Executing cancellation script...');

    // Execute the script
    const { stdout, stderr } = await execPromise(command, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: process.env,
    });

    // Parse output for summary
    const output = stdout + (stderr ? '\n' + stderr : '');

    // Extract summary from output
    const cancelledMatch = output.match(/Cancelled:\s*(\d+)/);
    const failedMatch = output.match(/Failed:\s*(\d+)/);
    const totalMatch = output.match(/Total:\s*(\d+)/);

    return NextResponse.json({
      success: true,
      message: 'Deployment cancellation completed',
      output: output,
      summary: {
        cancelled: cancelledMatch ? parseInt(cancelledMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        total: totalMatch ? parseInt(totalMatch[1]) : 0,
      },
    });

  } catch (error: any) {
    console.error('[Vercel Cancel] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to cancel deployments',
        details: error?.stderr || error?.stdout || error?.toString(),
      },
      { status: 500 }
    );
  }
}

