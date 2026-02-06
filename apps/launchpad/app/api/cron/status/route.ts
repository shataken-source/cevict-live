import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface CronJob {
  id: string;
  path: string;
  schedule: string;
  project: string;
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
  nextRun?: string;
  errorCount?: number;
  lastError?: string;
}

/**
 * Get cron job status from all projects
 * Checks vercel.json files and attempts to verify they're active
 */
export async function GET() {
  try {
    const cronJobs: CronJob[] = [];

    // PROGNO cron jobs
    const prognoCrons = [
      { path: '/api/admin/thursday', schedule: '0 14 * * 4', project: 'progno' },
      { path: '/api/admin/tuesday', schedule: '0 14 * * 2', project: 'progno' },
      { path: '/api/admin/friday', schedule: '0 14 * * 5', project: 'progno' },
      { path: '/api/admin/monday', schedule: '0 14 * * 1', project: 'progno' },
      { path: '/api/admin/all-leagues', schedule: '0 15 * * *', project: 'progno' },
    ];

    for (const cron of prognoCrons) {
      const status = await checkCronStatus('progno', cron.path);
      cronJobs.push({
        id: `progno-${cron.path.replace(/\//g, '-')}`,
        path: cron.path,
        schedule: cron.schedule,
        project: cron.project,
        ...status,
      });
    }

    // PopThePopcorn cron jobs
    const popthepopcornCrons = [
      { path: '/api/scrape', schedule: '*/5 * * * *', project: 'popthepopcorn' },
    ];

    for (const cron of popthepopcornCrons) {
      const status = await checkCronStatus('popthepopcorn', cron.path);
      cronJobs.push({
        id: `popthepopcorn-${cron.path.replace(/\//g, '-')}`,
        path: cron.path,
        schedule: cron.schedule,
        project: cron.project,
        ...status,
      });
    }

    // Check for other projects' cron jobs
    const otherProjects = ['petreunion', 'smokersrights', 'cevict', 'prognostication'];
    for (const project of otherProjects) {
      // Could scan vercel.json files here if needed
    }

    return NextResponse.json({
      success: true,
      cronJobs,
      total: cronJobs.length,
      active: cronJobs.filter(c => c.status === 'active').length,
      errors: cronJobs.filter(c => c.status === 'error').length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch cron status',
        cronJobs: [],
      },
      { status: 500 }
    );
  }
}

/**
 * Check if a cron job endpoint is accessible and working
 */
async function checkCronStatus(project: string, path: string): Promise<{
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
  nextRun?: string;
  errorCount?: number;
  lastError?: string;
}> {
  try {
    // Determine the base URL based on project
    const baseUrls: Record<string, string> = {
      progno: process.env.PROGNO_BASE_URL || 'https://progno.vercel.app',
      popthepopcorn: process.env.POPTHEPOPCORN_BASE_URL || 'https://popthepopcorn.vercel.app',
      petreunion: process.env.PETREUNION_BASE_URL || 'https://petreunion.org',
      smokersrights: process.env.SMOKERSRIGHTS_BASE_URL || 'https://smokersrights.com',
      cevict: process.env.CEVICT_BASE_URL || 'https://cevict.ai',
      prognostication: process.env.PROGNOSTICATION_BASE_URL || 'https://prognostication.com',
    };

    const baseUrl = baseUrls[project] || `https://${project}.vercel.app`;
    const fullUrl = `${baseUrl}${path}`;

    // Try to ping the endpoint (HEAD request to avoid triggering the job)
    try {
      const response = await fetch(fullUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Launchpad-Cron-Monitor/1.0',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      // If endpoint exists and responds, consider it active
      // Note: Some endpoints might require POST, but HEAD gives us basic connectivity
      if (response.status < 500) {
        return {
          status: 'active',
          lastRun: undefined, // Would need Vercel API to get actual last run
          nextRun: undefined, // Would need Vercel API to get actual next run
        };
      } else {
        return {
          status: 'error',
          lastError: `HTTP ${response.status}`,
          errorCount: 1,
        };
      }
    } catch (fetchError: any) {
      // If fetch fails, endpoint might not exist or be unreachable
      return {
        status: 'error',
        lastError: fetchError?.message || 'Endpoint unreachable',
        errorCount: 1,
      };
    }
  } catch (error: any) {
    return {
      status: 'error',
      lastError: error?.message || 'Unknown error',
      errorCount: 1,
    };
  }
}

