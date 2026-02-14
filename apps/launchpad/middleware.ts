import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/command-center',
  '/command-center/(.*)',
  '/affiliates',
  '/affiliates/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (req.nextUrl.pathname === '/' && !userId) {
    return NextResponse.redirect(new URL('/landing', req.url));
  }
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|map)).*)',
    '/(api|trpc)(.*)',
  ],
};
