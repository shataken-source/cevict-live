import { NextRequest, NextResponse } from 'next/server'

// Tier requirements per route prefix
const TIER_REQUIREMENTS: Record<string, 'pro' | 'elite'> = {
  '/picks/elite': 'elite',
  '/picks/pro': 'pro',
  '/premium-picks': 'pro',
  '/my-picks': 'pro',
  '/dashboard': 'pro',
}

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2 }

function getCookie(request: NextRequest, name: string): string | null {
  return request.cookies.get(name)?.value ?? null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Find if this path requires a tier
  const requiredTier = Object.entries(TIER_REQUIREMENTS).find(([prefix]) =>
    pathname.startsWith(prefix)
  )?.[1]

  if (!requiredTier) return NextResponse.next()

  const authEmail = getCookie(request, 'auth_email')
  const authTier = getCookie(request, 'auth_tier') as 'free' | 'pro' | 'elite' | null

  // Not logged in → redirect to login
  if (!authEmail || !authTier) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Tier insufficient → redirect to pricing
  if (TIER_RANK[authTier] < TIER_RANK[requiredTier]) {
    const pricingUrl = new URL('/pricing', request.url)
    pricingUrl.searchParams.set('required', requiredTier)
    pricingUrl.searchParams.set('email', decodeURIComponent(authEmail))
    return NextResponse.redirect(pricingUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/picks/elite/:path*',
    '/picks/pro/:path*',
    '/premium-picks/:path*',
    '/my-picks/:path*',
    '/dashboard/:path*',
  ],
}
