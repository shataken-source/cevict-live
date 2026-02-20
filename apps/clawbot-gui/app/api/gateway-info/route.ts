import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export async function GET() {
  try {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    const raw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    const token = config?.gateway?.token ?? null;
    const port = config?.gateway?.port ?? 18789;
    return NextResponse.json({ token, port, gatewayUrl: `ws://127.0.0.1:${port}`, dashboardUrl: `http://127.0.0.1:${port}/` });
  } catch {
    return NextResponse.json({ token: null, port: 18789, gatewayUrl: 'ws://127.0.0.1:18789', dashboardUrl: 'http://127.0.0.1:18789/' });
  }
}
