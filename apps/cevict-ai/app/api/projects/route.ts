import { NextResponse } from 'next/server'
import { AI_PROJECTS, getEnvironment, isFeatureEnabled } from '@/lib/config'
import { getSecurityHeaders, checkRateLimit, logAuditEvent } from '@/lib/security'

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  // Rate limiting
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimit.resetIn },
      { status: 429 }
    )
  }

  const env = getEnvironment()
  
  // Filter projects based on feature flags
  const availableProjects = AI_PROJECTS.filter(project => {
    switch (project.id) {
      case 'progno':
      case 'prognostication':
        return isFeatureEnabled('progno')
      case 'orchestrator':
        return isFeatureEnabled('orchestrator')
      case 'massager':
        return isFeatureEnabled('massager')
      case 'claude-effect':
        return isFeatureEnabled('claudeEffect')
      default:
        return true
    }
  }).map(project => ({
    ...project,
    url: env === 'production' ? project.prodUrl : project.testUrl
  }))

  // Log access
  logAuditEvent({
    action: 'GET_PROJECTS',
    ip,
    resource: '/api/projects',
    status: 'success'
  })

  return NextResponse.json({
    environment: env,
    projects: availableProjects,
    _meta: {
      rateLimit: {
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn
      }
    }
  }, {
    headers: {
      ...getSecurityHeaders(),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(rateLimit.resetIn)
    }
  })
}

