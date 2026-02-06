import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

type ProjectConfig = {
  id: string;
  name: string;
  devPort?: number | null;
  vercelUrl?: string;
};

type HealthStatus = 'up' | 'down' | 'unknown';

type ProjectHealth = {
  id: string;
  name: string;
  devPort?: number | null;
  vercelUrl?: string;
  status: HealthStatus;
  latencyMs?: number;
  error?: string;
};

// Map project names from projects.json to display names
const PROJECT_NAME_MAP: Record<string, string> = {
  'Progno - Sports Prediction': 'PROGNO',
  'Prognostication - Advanced Sports AI': 'Prognostication',
  'CEVICT - AI Platform': 'Cevict',
  'PetReunion': 'PetReunion',
};

async function checkHealth(url: string, timeoutMs: number = 5000): Promise<{ ok: boolean; latency: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    const latency = Date.now() - started;
    clearTimeout(timeout);
    return { ok: res.ok, latency, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err: any) {
    clearTimeout(timeout);
    return { ok: false, latency: Date.now() - started, error: err?.message || 'Request failed' };
  }
}

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'projects.json');
    let projects: ProjectConfig[] = [];

    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      projects = JSON.parse(raw);
    }

    // Also check hardcoded projects for dev ports
    const hardcodedProjects = [
      { name: 'Prognostication', devPort: 3005 },
      { name: 'Cevict', devPort: 3002 },
      { name: 'PROGNO', devPort: 3001 },
      { name: 'PetReunion', devPort: 3003 },
    ];

    const results: ProjectHealth[] = await Promise.all(
      hardcodedProjects.map(async (hardcoded) => {
        // Find matching project from projects.json
        const project = projects.find(p => {
          const mappedName = PROJECT_NAME_MAP[p.name] || p.name;
          return mappedName === hardcoded.name;
        });

        const devUrl = `http://localhost:${hardcoded.devPort}`;
        const prodUrl = project?.vercelUrl;

        // Try dev port first (faster, more relevant for local development)
        if (hardcoded.devPort) {
          const devCheck = await checkHealth(devUrl, 3000);
          if (devCheck.ok) {
            return {
              id: project?.id || hardcoded.name,
              name: hardcoded.name,
              devPort: hardcoded.devPort,
              vercelUrl: prodUrl,
              status: 'up',
              latencyMs: devCheck.latency,
            };
          }
        }

        // Fall back to production URL if dev is down
        if (prodUrl) {
          const prodCheck = await checkHealth(prodUrl, 5000);
          return {
            id: project?.id || hardcoded.name,
            name: hardcoded.name,
            devPort: hardcoded.devPort,
            vercelUrl: prodUrl,
            status: prodCheck.ok ? 'up' : 'down',
            latencyMs: prodCheck.latency,
            error: prodCheck.error,
          };
        }

        // No URL configured and dev port is down
        return {
          id: project?.id || hardcoded.name,
          name: hardcoded.name,
          devPort: hardcoded.devPort,
          vercelUrl: prodUrl,
          status: 'unknown',
          error: 'No URL configured and dev port unreachable',
        };
      })
    );

    return NextResponse.json({ ok: true, projects: results });
  } catch (error: any) {
    console.error('[launchpad health] error', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load health status' },
      { status: 500 }
    );
  }
}


