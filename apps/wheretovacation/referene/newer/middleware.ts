import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect /gcc/* routes to GCC app (gulfcoastcharters.com)
  // In production, this would redirect to the actual GCC domain
  // For now, we'll keep them on WTV but mark them as GCC routes
  if (pathname.startsWith('/gcc/')) {
    // In production, redirect to gulfcoastcharters.com
    // For development, we can keep them here or redirect to localhost:3004
    const isProduction = process.env.NODE_ENV === 'production';
    const gccDomain = process.env.GCC_DOMAIN || 'http://localhost:3004';

    if (isProduction && gccDomain !== 'http://localhost:3004') {
      const gccPath = pathname.replace('/gcc', '');
      return NextResponse.redirect(new URL(gccPath, gccDomain));
    }

    // In dev, allow /gcc routes to work on WTV
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/gcc/:path*',
  ],
};
