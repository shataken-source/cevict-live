// API Route: apps/launchpad/app/api/keys/distribute/route.ts
import { NextResponse } from 'next/server';
import { distributeKeys } from '@/lib/key-distributor';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      dryRun,
      scanCodebase,
      verbose,
      forceOverwrite,
      backup,
      validateKeys,
      interactive,
      appFilter
    } = body;

    const result = await distributeKeys({
      dryRun: dryRun === true,
      scanCodebase: scanCodebase === true,
      verbose: verbose === true,
      forceOverwrite: forceOverwrite === true,
      backup: backup === true,
      validateKeys: validateKeys === true,
      interactive: interactive === true,
      appFilter: appFilter || undefined
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Key distribution failed:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to distribute keys',
      error: error instanceof Error ? error.message : 'Unknown error',
      results: []
    }, { status: 500 });
  }
}

export async function GET() {
  // Return current key distribution status
  return NextResponse.json({
    available: true,
    scriptPath: 'DISTRIBUTE_KEYS.ps1',
    features: [
      'Dry run mode',
      'Codebase scanning',
      'Verbose output',
      'Preserves existing keys',
      'Comprehensive key discovery'
    ]
  });
}
