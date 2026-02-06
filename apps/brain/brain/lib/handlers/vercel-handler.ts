/**
 * Vercel Deployment Handler for Brain
 * Handles commands related to Vercel deployments
 */

import { getEnv } from '../../src/config';

const LAUNCHPAD_BASE_URL = getEnv('LAUNCHPAD_BASE_URL' as any) || 'http://localhost:3007';

export async function handleVercelCommand(
  command: string,
  args?: Record<string, unknown>
): Promise<{ success: boolean; message: string; data?: any }> {
  switch (command) {
    case 'cancel_queued_deployments':
      return await cancelQueuedDeployments(args);

    default:
      return {
        success: false,
        message: `Unknown Vercel command: ${command}`,
      };
  }
}

async function cancelQueuedDeployments(
  args?: Record<string, unknown>
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const token = (args?.token as string) || getEnv('VERCEL_TOKEN' as any);

    if (!token) {
      return {
        success: false,
        message: 'VERCEL_TOKEN is required. Set it as environment variable or pass in args.',
      };
    }

    // Call Launchpad's Vercel cancellation API
    const response = await fetch(`${LAUNCHPAD_BASE_URL}/api/vercel/cancel-deployments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        teamId: args?.teamId as string | undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (data.success) {
      const summary = data.summary || {};
      return {
        success: true,
        message: `Cancelled ${summary.cancelled || 0} deployments. Failed: ${summary.failed || 0}. Total: ${summary.total || 0}`,
        data: data.summary,
      };
    } else {
      return {
        success: false,
        message: data.error || 'Failed to cancel deployments',
        data: data.details,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to cancel Vercel deployments',
    };
  }
}

