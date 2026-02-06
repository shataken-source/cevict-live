import { NextRequest, NextResponse } from 'next/server';

type BrainPriority = 'low' | 'medium' | 'high';

const ALLOWED_TARGETS = [
  'progno-cron',
  'prognostication-cron',
  'popthepopcorn-cron',
  'system-maintenance',
  'vercel-deployments',
] as const;

const ALLOWED_COMMANDS = [
  'run_daily_card',
  'run_all_crons',
  'refresh_news',
  'rebuild_indexes',
  'warm_caches',
  'cancel_queued_deployments',
] as const;

type AllowedTarget = (typeof ALLOWED_TARGETS)[number];
type AllowedCommand = (typeof ALLOWED_COMMANDS)[number];

interface CommandBody {
  target: string;
  command: string;
  args?: Record<string, unknown>;
  priority?: BrainPriority;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CommandBody;

    const target = String(body?.target || '').trim();
    const command = String(body?.command || '').trim();
    const priority: BrainPriority = (body?.priority as BrainPriority) || 'medium';
    const args = (body?.args && typeof body.args === 'object') ? body.args : {};

    if (!target || !command) {
      return NextResponse.json(
        { ok: false, error: 'target and command are required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TARGETS.includes(target as AllowedTarget)) {
      return NextResponse.json(
        { ok: false, error: 'target not allowed from voice/control surface' },
        { status: 403 }
      );
    }

    if (!ALLOWED_COMMANDS.includes(command as AllowedCommand)) {
      return NextResponse.json(
        { ok: false, error: 'command not allowed from voice/control surface' },
        { status: 403 }
      );
    }

    // Handle Vercel deployment commands directly
    if (target === 'vercel-deployments' && command === 'cancel_queued_deployments') {
      try {
        const vercelToken = (args?.token as string) || process.env.VERCEL_TOKEN;

        if (!vercelToken) {
          return NextResponse.json(
            { ok: false, error: 'VERCEL_TOKEN is required. Set it as environment variable or pass in args.' },
            { status: 400 }
          );
        }

        const cancelResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3007'}/api/vercel/cancel-deployments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: vercelToken,
            teamId: args?.teamId as string | undefined,
          }),
        });

        const cancelData = await cancelResponse.json().catch(() => ({}));

        return NextResponse.json({
          ok: cancelData.success,
          status: cancelResponse.status,
          data: {
            message: cancelData.message || (cancelData.success ? 'Deployments cancelled successfully' : 'Failed to cancel deployments'),
            summary: cancelData.summary,
            output: cancelData.output,
          },
        });
      } catch (error: any) {
        return NextResponse.json(
          { ok: false, error: error?.message || 'Failed to cancel Vercel deployments' },
          { status: 500 }
        );
      }
    }

    // For other commands, dispatch to Brain
    const dispatchUrl =
      process.env.BRAIN_DISPATCH_URL ||
      process.env.BRAIN_BASE_URL && `${process.env.BRAIN_BASE_URL}/api/brain/dispatch` ||
      'http://localhost:3006/api/brain/dispatch';

    const token = process.env.BRAIN_API_TOKEN || '';
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'BRAIN_API_TOKEN is not configured' },
        { status: 500 }
      );
    }

    const upstream = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        target,
        payload: {
          command,
          args,
          priority,
        },
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(
      {
        ok: upstream.ok,
        status: upstream.status,
        data,
      },
      { status: upstream.ok ? 200 : upstream.status }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'brain command failed' },
      { status: 500 }
    );
  }
}


