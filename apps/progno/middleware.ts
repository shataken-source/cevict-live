import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware: Block all frontend page routes.
 * Progno is backend-only — only /api/* routes are public.
 * Everything else returns 404.
 */
export function middleware(request: NextRequest) {
  return new NextResponse('Not Found', { status: 404 });
}

export const config = {
  // Match everything EXCEPT /api routes and Next.js internals
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
