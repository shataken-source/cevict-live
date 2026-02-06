import { NextRequest, NextResponse } from 'next/server'
import { getEnvironment, AI_PROJECTS } from '@/lib/config'
import { checkRateLimit, validateApiKey, logAuditEvent, getSecurityHeaders } from '@/lib/security'

/**
 * API Proxy for AI Projects
 * Routes requests to the appropriate test or production environment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params, 'DELETE')
}

async function handleProxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
  const { path } = await params
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const apiKey = request.headers.get('x-api-key')
  
  // Rate limiting
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    logAuditEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      ip,
      resource: `/api/proxy/${path.join('/')}`,
      status: 'failure'
    })
    
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getSecurityHeaders() }
    )
  }

  // Validate API key if provided
  const auth = validateApiKey(apiKey)
  
  // Extract project from path
  const [projectId, ...restPath] = path
  const project = AI_PROJECTS.find(p => p.id === projectId)
  
  if (!project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404, headers: getSecurityHeaders() }
    )
  }

  // Determine target URL
  const env = getEnvironment()
  const baseUrl = env === 'production' ? project.prodUrl : project.testUrl
  const targetUrl = `${baseUrl}/${restPath.join('/')}`

  try {
    // Forward the request
    const headers = new Headers()
    request.headers.forEach((value, key) => {
      if (!['host', 'connection'].includes(key.toLowerCase())) {
        headers.set(key, value)
      }
    })
    
    // Add tracking headers
    headers.set('X-Forwarded-By', 'cevict-gateway')
    headers.set('X-Request-Id', crypto.randomUUID())
    headers.set('X-User-Tier', auth.tier)

    const fetchOptions: RequestInit = {
      method,
      headers
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = await request.text()
    }

    const response = await fetch(targetUrl, fetchOptions)
    const data = await response.json()

    // Log the proxy request
    logAuditEvent({
      action: `PROXY_${method}`,
      ip,
      resource: targetUrl,
      status: response.ok ? 'success' : 'failure',
      details: { projectId, tier: auth.tier }
    })

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        ...getSecurityHeaders(),
        'X-Proxied-To': project.name
      }
    })
  } catch (error) {
    logAuditEvent({
      action: `PROXY_${method}_ERROR`,
      ip,
      resource: targetUrl,
      status: 'failure',
      details: { error: String(error) }
    })

    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 502, headers: getSecurityHeaders() }
    )
  }
}

