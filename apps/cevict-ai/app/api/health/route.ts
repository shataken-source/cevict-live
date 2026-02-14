import { NextResponse } from 'next/server'
import { getConfig, getEnvironment, AI_PROJECTS } from '@/lib/config'
import { getSecurityHeaders } from '@/lib/security'

export async function GET() {
  const config = getConfig()
  const env = getEnvironment()

  const health = {
    status: 'healthy',
    environment: env,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      gateway: 'operational',
      database: 'operational',
      cache: 'operational'
    },
    projects: AI_PROJECTS.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      url: env === 'production' ? p.prodUrl : p.testUrl
    })),
    config: {
      rateLimitRequests: config.security.rateLimitRequests,
      cspEnabled: config.security.cspEnabled,
      features: config.features
    }
  }

  return NextResponse.json(health, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Cache-Control': 'no-store'
    }
  })
}

